#!/usr/bin/env python3
"""Q2 M0 reproducible native differential oracle, standard-library only.

Runs Q2 release baseline and Q1 external compatibility probe.
Stores immutable command transcripts and per-file raw SHA-256 manifests.
Does NOT normalize artifacts or claim preview/WASM conformance.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path

def sha(data):
    return hashlib.sha256(data).hexdigest()

def put(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

def tree_manifest(root: Path):
    if not root.is_dir():
        return {}
    return {str(p.relative_to(root)): sha(p.read_bytes())
            for p in sorted(root.rglob("*")) if p.is_file()}

def diff(a, b):
    return [{"file": k, "incremental": a.get(k), "clean": b.get(k)}
            for k in sorted(set(a)|set(b)) if a.get(k) != b.get(k)]

def runner(exe, args, cwd, env, name, logdir, timeout=110):
    started=time.perf_counter()
    try:
        p=subprocess.run([str(exe),*args],cwd=str(cwd),env=env,stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE,text=True,timeout=timeout)
        status=p.returncode; out=p.stdout; err=p.stderr
    except subprocess.TimeoutExpired as exc:
        status=124
        out=(exc.stdout or b"").decode(errors="replace") if isinstance(exc.stdout,bytes) else (exc.stdout or "")
        err=(exc.stderr or b"").decode(errors="replace") if isinstance(exc.stderr,bytes) else (exc.stderr or "")
    duration=round(time.perf_counter()-started,3)
    put(logdir/(name+".stdout"),out)
    put(logdir/(name+".stderr"),err)
    return {"step":name,"exit":status,"duration_s":duration,"args":args,"cwd":str(cwd),
            "stdout":str((logdir/(name+".stdout")).relative_to(logdir.parent)),
            "stderr":str((logdir/(name+".stderr")).relative_to(logdir.parent)),
            "stdout_head":out[:1200],"stderr_head":err[:1200]}

def mutate(case, root, after):
    cfg=root/"_quarto.yml"
    first=root/"posts/first.qmd"
    if case=="body":
        first.write_text(first.read_text()+"\n\nUpdated passage for M0 revision B.\n")
    elif case=="heading":
        first.write_text(first.read_text().replace("Body of the first post.","## New section {#sec-new}\n\nBody of the first post.",1))
    elif case=="nested_include":
        leaf=root/"snippets/leaf.qmd"
        if after:
            leaf.write_text("Updated nested inclusion content B.\n")
        else:
            put(leaf,"Nested inclusion content A.\n")
            put(root/"snippets/parent.qmd","{{< include leaf.qmd >}}\n")
            first.write_text(first.read_text()+"\n\n{{< include ../snippets/parent.qmd >}}\n")
    elif case=="nav_title":
        if after:
            cfg.write_text(cfg.read_text().replace('title: "Incremental"','title: "Changed navigation heading"'))
    elif case=="bibliography":
        bib=root/"references.bib"
        if after:
            put(bib,'@article{doe2020, title={Updated source B}, author={Doe, Jane}, year={2020}, journal={Example}}\n')
        else:
            cfg.write_text(cfg.read_text()+"\nbibliography: references.bib\n")
            first.write_text(first.read_text()+"\n\nCitation [@doe2020].\n")
            put(bib,'@article{doe2020, title={Initial source A}, author={Doe, Jane}, year={2020}, journal={Example}}\n')
    elif case=="image":
        img=root/"assets/figure.svg"
        if after:
            put(img,'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><text x="5" y="22">UPDATED B</text></svg>\n')
        else:
            put(img,'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><text x="5" y="22">START A</text></svg>\n')
            first.write_text(first.read_text()+"\n\n![Picture](../assets/figure.svg)\n")
    else: raise ValueError(case)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--q2",type=Path,required=True)
    ap.add_argument("--q1",type=Path,required=True)
    ap.add_argument("--fixture",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    args=ap.parse_args()
    q2=args.q2.resolve();q1=args.q1.resolve();src=args.fixture.resolve();dest=args.out.resolve()
    dest.mkdir(parents=True,exist_ok=True)
    home=dest/"sandbox-home"
    for p in [home/"Library/Caches/quarto",home/".cache/quarto",home/".local/share"]:p.mkdir(parents=True,exist_ok=True)
    env=os.environ.copy()
    env.update({"HOME":str(home),"XDG_CACHE_HOME":str(home/".cache"),"QUARTO_CACHE_DIR":str(home/".cache/quarto"),
                "TZ":"UTC","LC_ALL":"C","LANG":"C","SOURCE_DATE_EPOCH":"1609459200"})
    logdir=dest/"logs";logdir.mkdir(exist_ok=True)
    record={"schema":"quartier.q2-m0.native-oracle.v1",
            "description":"Q2 0.32.0 native release executable; raw artifacts; release source fixture",
            "system":{"platform":platform.platform(),"python":sys.version,
                      "q2_sha256":sha(q2.read_bytes()),"q1_sha256":sha(q1.read_bytes()),
                      "q2":str(q2),"q1":str(q1),"fixture":str(src)},
            "commands":[],"cases":{},"q1_comparison":{}}
    for title, exe, argv in [("q2_version",q2,["--version"]),("q1_version",q1,["--version"]),
                             ("q1_pandoc",q1,["pandoc","--version"])]:
        record["commands"].append(runner(exe,argv,dest,env,title,logdir,timeout=30))

    for case in ["body","heading","nested_include","nav_title","bibliography","image"]:
        ca=dest/"cases"/case
        inc=ca/"incremental";cold=ca/"clean"
        if ca.exists():shutil.rmtree(ca)
        def ignore(p,names):
            return [x for x in names if x in ("_site",".quarto","_freeze","node_modules")]
        shutil.copytree(src,inc,ignore=ignore)
        if case in ("nested_include","bibliography","image"):mutate(case,inc,False)
        steps=[]
        steps.append(runner(q2,["render",str(inc)],inc,env,case+"-initial-full",logdir))
        initial=tree_manifest(inc/"_site")
        profile_count=len(list((inc/".quarto/cache/profiles").glob("*"))) if (inc/".quarto/cache/profiles").exists() else 0
        steps.append(runner(q2,["render",str(inc)],inc,env,case+"-warm-full",logdir))
        warm=tree_manifest(inc/"_site")
        mutate(case,inc,True)
        shutil.copytree(inc,cold,ignore=ignore)
        steps.append(runner(q2,["render",str(inc/"posts/first.qmd")],inc,env,case+"-subset",logdir))
        incremental=tree_manifest(inc/"_site")
        steps.append(runner(q2,["render",str(cold)],cold,env,case+"-clean-full",logdir))
        clean=tree_manifest(cold/"_site")
        html_diff=[x for x in diff(incremental,clean) if x["file"].endswith(".html")]
        unchanged_html=[x for x in diff(initial,incremental) if x["file"].endswith(".html")]
        record["cases"][case]={"steps":steps,"profile_cache_entries_after_initial":profile_count,
                              "initial_files":len(initial),"warm_vs_initial":diff(warm,initial),
                              "subset_vs_clean_differences":diff(incremental,clean),
                              "html_subset_vs_clean_differences":html_diff,
                              "changed_html_initial_to_subset":[x["file"] for x in unchanged_html],
                              "subset_target_html_equal":incremental.get("posts/first.html")==clean.get("posts/first.html"),
                              "clean_full_success":steps[-1]["exit"]==0,
                              "all_steps_success":all(x["exit"]==0 for x in steps)}

    for name,source in [
       ("plain","# Example\n\nA **bold** text and [link](https://example.org).\n\n## Second heading\n\nA list:\n\n- one\n- two\n"),
       ("crossrefs","## First section {#sec-alpha}\n\nSee @sec-alpha.\n\n## Second section {#sec-beta}\n\nSee @sec-beta.\n"),
       ("tables","## Tables\n\n| Year | Value |\n|-----:|------:|\n| 2025 | 2 |\n| 2026 | 3 |\n\nAn equation: $x^2 + y^2$.\n")
    ]:
        root=dest/"q1-parity"/name
        q1dir=root/"q1";q2dir=root/"q2"
        if root.exists():shutil.rmtree(root)
        q1dir.mkdir(parents=True);q2dir.mkdir()
        source="---\ntitle: M0 "+name+"\nformat: html\nexecute: false\n---\n\n"+source
        for d in [q1dir,q2dir]:put(d/"test.qmd",source)
        q1cmd=runner(q1,["render","test.qmd","--to","html"],q1dir,env,"q1-"+name,logdir,timeout=110)
        q2cmd=runner(q2,["render","test.qmd","--to","html"],q2dir,env,"q2-"+name,logdir,timeout=110)
        q1html=q1dir/"test.html";q2html=q2dir/"test.html"
        r1=q1html.read_bytes() if q1html.is_file() else b""
        r2=q2html.read_bytes() if q2html.is_file() else b""
        record["q1_comparison"][name]={
            "q1":q1cmd,"q2":q2cmd,
            "both_success":q1cmd["exit"]==0 and q2cmd["exit"]==0,
            "both_output_present":bool(r1 and r2),
            "byte_equal":bool(r1 and r2 and r1==r2),
            "q1_sha256":sha(r1) if r1 else None,
            "q2_sha256":sha(r2) if r2 else None,
            "q1_size":len(r1),"q2_size":len(r2)}
    put(dest/"result.json",json.dumps(record,indent=2,ensure_ascii=False)+"\n")
    lines=["# Executed Q2-M0 Native Oracle", "",
        "Artifact SHA-256 comparisons are exact; no HTML normalization.",
        "Q2 native release vs clean full, and Q1 external oracle (not full M0 conformance).",""]
    lines+=["| Scenario | Commands passed | Target HTML equals clean? | All HTML diffs | Warm artifact diffs |",
            "|---|---|---|---:|---:|"]
    for name,result in record["cases"].items():
        lines.append("| %s | %s | %s | %d | %d |"%(name,result["all_steps_success"],
          result["subset_target_html_equal"],len(result["html_subset_vs_clean_differences"]),
          len(result["warm_vs_initial"])))
    lines+=["","| Q1↔Q2 fixture | Both rendered | Byte equal | Q1 bytes | Q2 bytes |",
            "|---|---|---|---:|---:|"]
    for name,x in record["q1_comparison"].items():lines.append("| %s | %s | %s | %d | %d |"%(name,x["both_success"],x["byte_equal"],x["q1_size"],x["q2_size"]))
    lines+=["","See result.json and logs/ for exact invocations, stderr, artifact paths and SHA-256 evidence.",
            "This does not verify WASM parity, newest Q2 head, full Rust test suite or pure-stage reuse."]
    put(dest/"SUMMARY.md","\n".join(lines)+"\n")
    print("\n".join(lines))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
