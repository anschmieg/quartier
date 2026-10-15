//! Q2-M1 source-pinned project-preview dependency regression.
//! This test is deliberately red on Q2 d110cf7e: the /deps HTTP endpoint
//! reports only direct includes, ignoring a nested leaf.
//! The baseline harness must verify this assertion failure, not a build error.

use std::net::TcpListener;
use std::path::Path;
use std::time::{Duration, Instant};

use quarto_preview::PreviewConfig;

fn free_port() -> u16 {
    let s = TcpListener::bind("127.0.0.1:0").expect("probe port");
    s.local_addr().unwrap().port()
}

fn write(root: &Path, rel: &str, text: &str) {
    let path = root.join(rel);
    std::fs::create_dir_all(path.parent().unwrap()).unwrap();
    std::fs::write(path, text).unwrap();
}

async fn wait_for_health(port: u16) {
    let url = format!("http://127.0.0.1:{port}/health");
    let deadline = Instant::now() + Duration::from_secs(30);
    loop {
        if let Ok(response) = reqwest::get(&url).await {
            if response.status().is_success() {
                return;
            }
        }
        assert!(Instant::now() < deadline, "Q2 project preview did not start");
        tokio::time::sleep(Duration::from_millis(75)).await;
    }
}

async fn http_deps(port: u16) -> Vec<String> {
    let url = format!("http://127.0.0.1:{port}/api/preview/deps?page=index.qmd");
    let response = reqwest::get(&url).await.expect("preview deps HTTP request");
    let status = response.status();
    let body = response.text().await.expect("preview deps HTTP body");
    assert!(status.is_success(), "deps endpoint HTTP {status}: {body}");
    let parsed: serde_json::Value = serde_json::from_str(&body).expect("deps JSON");
    parsed["deps"]
        .as_array()
        .expect("deps array")
        .iter()
        .map(|v| v.as_str().expect("string dependency").to_string())
        .collect()
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn m1_project_mode_nested_include_http_deps() {
    let project = tempfile::TempDir::with_prefix("q2-m1-project-").unwrap();
    write(project.path(), "_quarto.yml", "project:\\n  type: website\\n");
    write(project.path(), "index.qmd", "# Index\\n\\n{{< include snippets/outer.qmd >}}\\n");
    write(project.path(), "snippets/outer.qmd", "Outer v1\\n\\n{{< include leaf.qmd >}}\\n");
    write(project.path(), "snippets/leaf.qmd", "LEAF_V1\\n");
    write(project.path(), "unrelated.qmd", "# Unrelated\\n");

    let data = tempfile::TempDir::with_prefix("q2-m1-data-").unwrap();
    let port = free_port();
    let config = PreviewConfig {
        host: "127.0.0.1".to_owned(),
        port,
        project_root: Some(project.path().to_path_buf()),
        single_file: None,
        data_dir: data.path().to_path_buf(),
        spa_dir_override: None,
        engine_registry: None,
        engine_policy: Default::default(),
        resource_html_files: Vec::new(),
        cache_dir: None,
        allow_edit: false,
        share: false,
        ui: Default::default(),
    };
    let server = tokio::spawn(async move {
        quarto_preview::run(config).await.expect("preview server");
    });
    wait_for_health(port).await;

    let before = http_deps(port).await;
    assert_eq!(
        before,
        ["snippets/leaf.qmd", "snippets/outer.qmd"],
        "M1_NESTED_INCLUDE_NOT_TRACKED: project-mode preview must observe transitive includes; an unrelated source must stay excluded",
    );

    // Dependency removal must replace, not union, previous closure.
    write(project.path(), "snippets/outer.qmd", "Outer v2, no nested include\\n");
    assert_eq!(http_deps(port).await, ["snippets/outer.qmd"]);

    // Dependency addition must take effect without editing the parent.
    write(project.path(), "snippets/outer.qmd", "Outer v3\\n\\n{{< include next.qmd >}}\\n");
    write(project.path(), "snippets/next.qmd", "NEXT\\n");
    assert_eq!(
        http_deps(port).await,
        ["snippets/next.qmd", "snippets/outer.qmd"]
    );

    server.abort();
}
