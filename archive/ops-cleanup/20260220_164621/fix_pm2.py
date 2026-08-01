#!/usr/bin/env python3
import subprocess
import os
import sys

KEY_FILE = os.path.expanduser("~/Desktop/tour-stream-api-key.pem")
SERVER = "ubuntu@43.201.66.181"

def run_command(cmd):
    """명령어 실행"""
    print(f"실행: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"오류: {result.stderr}")
    else:
        print(result.stdout)
    return result.returncode == 0

def main():
    print("🔧 PM2 설정 파일 수정 중...")
    
    # ecosystem.config.cjs 업로드
    print("📤 ecosystem.config.cjs 업로드 중...")
    if not run_command(f'scp -i "{KEY_FILE}" ecosystem.config.cjs "{SERVER}:/var/www/api/"'):
        print("❌ 파일 업로드 실패")
        return False
    
    # PM2 재시작
    print("🚀 PM2 서버 재시작 중...")
    commands = [
        f'ssh -i "{KEY_FILE}" "{SERVER}" "cd /var/www/api && pm2 delete tourstream-api 2>/dev/null || true"',
        f'ssh -i "{KEY_FILE}" "{SERVER}" "cd /var/www/api && pm2 start ecosystem.config.cjs"',
        f'ssh -i "{KEY_FILE}" "{SERVER}" "pm2 save"',
    ]
    
    for cmd in commands:
        if not run_command(cmd):
            print(f"❌ 명령어 실행 실패: {cmd}")
            return False
    
    # 서버 테스트
    print("🧪 서버 테스트 중...")
    import time
    time.sleep(2)
    
    run_command(f'ssh -i "{KEY_FILE}" "{SERVER}" "curl -s http://localhost:3002/ | head -10"')
    run_command(f'ssh -i "{KEY_FILE}" "{SERVER}" "pm2 status"')
    
    print("\n✅ 완료!")
    print("\n서버 접속: http://43.201.66.181:3002/")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
