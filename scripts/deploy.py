"""把本地 dist 发布到阿里云 ECS。

用法：
  npm run build
  DEPLOY_PASS='服务器密码' npm run deploy

可选环境变量：
  DEPLOY_HOST     默认 47.116.125.139
  DEPLOY_USER     默认 root
  DEPLOY_KEY      SSH 私钥路径；提供后优先于密码
  DEPLOY_REMOTE   默认 /opt/hotspot-tracker/dist

安全说明：只替换远端 index.html 和 assets/，不动 dist/data 榜单 JSON，也不动 sync-data.json 收藏数据。
"""

import os
import posixpath
import sys
from pathlib import Path

try:
    import paramiko
except ImportError:
    raise SystemExit("缺少依赖 paramiko。请先运行：pip install paramiko")

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DIST = ROOT / "dist"
HOST = os.environ.get("DEPLOY_HOST", "47.116.125.139")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_PASS")
KEY = os.environ.get("DEPLOY_KEY")
REMOTE_DIST = os.environ.get("DEPLOY_REMOTE", "/opt/hotspot-tracker/dist").rstrip("/")


def sftp_mkdir_p(sftp, path: str) -> None:
    cur = ""
    for part in [p for p in path.split("/") if p]:
        cur += "/" + part
        try:
            sftp.stat(cur)
        except FileNotFoundError:
            sftp.mkdir(cur)


def upload_dir(sftp, local_dir: Path, remote_dir: str) -> int:
    count = 0
    for root, _dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir)
        remote_root = remote_dir if rel == "." else posixpath.join(remote_dir, rel.replace(os.sep, "/"))
        sftp_mkdir_p(sftp, remote_root)
        for name in files:
            sftp.put(os.path.join(root, name), posixpath.join(remote_root, name))
            count += 1
    return count


def run(client, cmd: str) -> str:
    _stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if code != 0:
        raise RuntimeError(f"远端命令失败({code}): {cmd}\n{err}")
    return out


def main() -> None:
    if not (LOCAL_DIST / "index.html").exists():
        raise SystemExit("没找到 dist/index.html，请先运行：npm run build")
    if not KEY and not PASSWORD:
        raise SystemExit("请设置 DEPLOY_PASS（服务器密码）或 DEPLOY_KEY（SSH 私钥路径）后再运行。")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect_kwargs = {"hostname": HOST, "username": USER, "timeout": 15}
    if KEY:
        connect_kwargs["key_filename"] = KEY
    else:
        connect_kwargs["password"] = PASSWORD
    client.connect(**connect_kwargs)

    try:
        run(client, f"rm -rf {REMOTE_DIST}/assets && mkdir -p {REMOTE_DIST}")
        sftp = client.open_sftp()
        try:
            uploaded = []
            for entry in sorted(LOCAL_DIST.iterdir()):
                if entry.name == "data":
                    continue
                if entry.is_file():
                    sftp.put(str(entry), f"{REMOTE_DIST}/{entry.name}")
                    uploaded.append(entry.name)
                elif entry.is_dir():
                    uploaded.append(f"{entry.name}/({upload_dir(sftp, entry, REMOTE_DIST + '/' + entry.name)})")
        finally:
            sftp.close()

        assets = sorted((LOCAL_DIST / "assets").iterdir())
        js = next((p.name for p in assets if p.suffix == ".js"), None)
        home_code = run(client, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/")
        asset_code = run(client, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1/assets/{js}") if js else "skip"
        print(f"上传完成：{', '.join(uploaded)}")
        print(f"本机校验：/ => {home_code}，/assets/{js} => {asset_code}")
        print("线上地址：https://hitsuji-shouka.com/")
    finally:
        client.close()


if __name__ == "__main__":
    main()
