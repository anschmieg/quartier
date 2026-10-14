#!/usr/bin/env python3
"""Probe Q2's real localhost preview dependency endpoint, without opening a browser."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import threading
import time
from urllib.request import urlopen
from urllib.error import URLError

p=argparse.ArgumentParser()
p.add_argument("--q2",required=True,type=Path)
p.add_argument("--fixture",required=True,type=Path)
p.add_argument("--out",required=True,type=Path)
args=p.parse_args()
q2=args.q2.resolve();source=args.fixture.resolve();out=args.out.resolve()
out.mkdir(parents=True,exist_ok=True)
proj=out/"fixture"
if proj.exists():shutil.rmtree(proj)
shutil.copytree(source,proj,ignore=lambda path,names:[n for n in names if n in ("_site",".quarto","_freeze")])
first=proj/"posts/first.qmd"
(first.parent.parent/"snippets").mkdir(exist_ok=True)
(first.parent.parent/"snippets"/"outer.qmd").write_text("{{< include inner.qmd >}}\n")
(first.parent.parent/"snippets"/"inner.qmd").write_text("Inner leaf included.\n")
first.write_text(first.read_text()+"\n\n{{< include ../snippets/outer.qmd >}}\n")
env=os.environ.copy()
home=out/"home"
for d in [home/".cache/quarto",home/"Library/Caches/quarto"]:d.mkdir(parents=True,exist_ok=True)
env.update({"HOME":str(home),"XDG_CACHE_HOME":str(home/".cache"),"QUARTO_CACHE_DIR":str(home/".cache/quarto")})
with socket.socket() as sk:
    sk.bind(("127.0.0.1",0));port=sk.getsockname()[1]
cmd=[str(q2),"preview",str(first),"--no-browser","--host","127.0.0.1","--port",str(port),"--data-dir",str(out/"preview-data")]
proc=subprocess.Popen(cmd,cwd=str(proj),env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
lines=[]
def drain():
    for ln in proc.stdout:
        lines.append(ln)
th=threading.Thread(target=drain,daemon=True);th.start()
result={"command":cmd,"port":port,"status":"not_started","server_log":[]}
def fetch(path):
    with urlopen(f"http://127.0.0.1:{port}{path}",timeout=2) as resp:
        return resp.status,resp.read().decode("utf-8",errors="replace")[:3000]
try:
    ok=False
    for i in range(90):
        if proc.poll() is not None:break
        try:
            status,body=fetch("/")
            if status==200:
                ok=True;break
        except (URLError,OSError,TimeoutError):
            pass
        time.sleep(.3)
    result["status"]="running" if ok else "not_ready"
    if ok:
        result["root_status"]=status
        for label,path in [
            ("first","/api/preview/deps?page=posts%2Ffirst.qmd"),
            ("outer","/api/preview/deps?page=snippets%2Fouter.qmd"),
            ("index","/api/preview/deps?page=index.qmd"),
        ]:
            try:
                code,body=fetch(path)
                result[label]={"status":code,"body":body}
            except Exception as exc:
                result[label]={"error":str(exc)}
finally:
    proc.terminate()
    try:proc.wait(timeout=8)
    except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
    th.join(timeout=2)
    result["server_log"]=lines[-100:]
    (out/"preview_probe.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result,indent=2)[:8500])
