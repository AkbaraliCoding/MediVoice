#!/usr/bin/env python3
"""
MediVoice — Lokal WiFi Server
Ishga tushirish: python server.py
"""

import http.server
import socketserver
import socket
import os
import sys
import json
import hashlib
import getpass

PORT = 8080
AUTH_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".admin_auth")
CONFIG_JS  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "config.js")

# ─── RANGLAR ────────────────────────────────────────────
R = "\033[31m"   # qizil
G = "\033[32m"   # yashil
Y = "\033[33m"   # sariq
C = "\033[36m"   # ko'k
B = "\033[1m"    # qalin
X = "\033[0m"    # reset

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def load_credentials():
    """Saqlangan login/parolni yuklash"""
    if os.path.exists(AUTH_FILE):
        try:
            with open(AUTH_FILE, "r") as f:
                data = json.load(f)
                if "username" in data and "password_hash" in data:
                    return data
        except:
            pass
    return None

def save_credentials(username, password_hash):
    """Login/parolni saqlash"""
    with open(AUTH_FILE, "w") as f:
        json.dump({"username": username, "password_hash": password_hash}, f)
    # Faylni faqat egasi o'qiy olsin
    try:
        os.chmod(AUTH_FILE, 0o600)
    except:
        pass

def setup_admin():
    """Birinchi marta admin login/parol o'rnatish"""
    print()
    print(f"{B}{'=' * 54}{X}")
    print(f"   {C}🔐  MediVoice — Admin hisob sozlash{X}")
    print(f"{B}{'=' * 54}{X}")
    print()
    print(f"  {Y}Birinchi marta ishga tushirilmoqda.{X}")
    print(f"  Admin uchun username va parol o'rnating:")
    print()

    while True:
        username = input(f"  {B}Username:{X} ").strip()
        if len(username) < 3:
            print(f"  {R}❌ Username kamida 3 ta harf bo'lishi kerak{X}\n")
            continue
        break

    while True:
        password = getpass.getpass(f"  {B}Parol:{X} ")
        if len(password) < 4:
            print(f"  {R}❌ Parol kamida 4 ta belgi bo'lishi kerak{X}\n")
            continue
        confirm = getpass.getpass(f"  {B}Parolni tasdiqlang:{X} ")
        if password != confirm:
            print(f"  {R}❌ Parollar mos kelmadi, qayta urinib ko'ring{X}\n")
            continue
        break

    ph = hash_password(password)
    save_credentials(username, ph)

    print()
    print(f"  {G}✅ Admin hisob muvaffaqiyatli saqlandi!{X}")
    print(f"  Endi har safar server ishga tushganda so'ralmaydi.")
    return {"username": username, "password_hash": ph}

def inject_credentials_to_config(username, password_hash):
    """config.js ga admin credentials qo'shish (plain password emas, hash)"""
    if not os.path.exists(CONFIG_JS):
        print(f"  {R}⚠️  js/config.js topilmadi{X}")
        return

    with open(CONFIG_JS, "r", encoding="utf-8") as f:
        content = f.read()

    # Eski ADMIN_CREDENTIALS ni o'chirish
    import re
    content = re.sub(
        r'\n\s*//\s*Admin.*?\n\s*ADMIN_CREDENTIALS:.*?\},?\n',
        '\n',
        content,
        flags=re.DOTALL
    )
    content = re.sub(r'\n{3,}', '\n\n', content)

    # Credentials qo'shish (closing }; dan oldin)
    creds_block = (
        f"\n  // Admin panel kirish ma'lumotlari (server tomonidan sozlangan)\n"
        f"  ADMIN_CREDENTIALS: {{\n"
        f"    username: {json.dumps(username)},\n"
        f"    password: {json.dumps(password_hash)},\n"
        f"    isHashed: true\n"
        f"  }},\n"
    )
    content = content.rstrip()
    if content.endswith("};"):
        content = content[:-2] + creds_block + "};"
    else:
        content += creds_block

    with open(CONFIG_JS, "w", encoding="utf-8") as f:
        f.write(content)

# ─── HTTP HANDLER ────────────────────────────────────────
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        status = args[1] if len(args) > 1 else "?"
        color = G if str(status).startswith("2") else R if str(status).startswith(("4","5")) else Y
        print(f"  {color}→{X} [{self.address_string()}]  {args[0]}")

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        # Eski URL lar uchun redirect
        if self.path == "/feedback.html":
            self.path = "/pages/feedback.html"
        elif self.path.startswith("/feedback.html?"):
            self.path = "/pages/feedback.html?" + self.path.split("?", 1)[1]
        elif self.path == "/admin.html":
            self.path = "/pages/admin.html"
        super().do_GET()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

# ─── MAIN ────────────────────────────────────────────────
if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Port argumentdan olish
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except:
            pass

    # Admin hisob tekshirish
    creds = load_credentials()
    if creds is None:
        creds = setup_admin()

    # config.js ga credentials inject qilish
    inject_credentials_to_config(creds["username"], creds["password_hash"])

    local_ip = get_local_ip()

    # Port band tekshirish
    socketserver.TCPServer.allow_reuse_address = True
    try:
        httpd = socketserver.TCPServer(("0.0.0.0", PORT), Handler)
    except OSError:
        print(f"\n  {R}❌  {PORT}-port band!{X} Boshqa port: {C}python server.py 8081{X}\n")
        sys.exit(1)

    print()
    print(f"{B}{'=' * 54}{X}")
    print(f"   🏥  {B}MediVoice — Lokal WiFi Server{X}")
    print(f"{B}{'=' * 54}{X}")
    print()
    print(f"  {G}✅  Server ishga tushdi!{X}")
    print(f"  {Y}👤  Admin:{X} {creds['username']}")
    print()
    print(f"  💻  Shu kompyuterdan:")
    print(f"      {C}http://localhost:{PORT}{X}")
    print()
    print(f"  📱  WiFi orqali telefon/planshetdan:")
    print(f"      {C}http://{local_ip}:{PORT}{X}")
    print()
    print(f"  📋  Sahifalar:")
    print(f"      Bosh sahifa  →  {C}http://{local_ip}:{PORT}/{X}")
    print(f"      Feedback     →  {C}http://{local_ip}:{PORT}/pages/feedback.html{X}")
    print(f"      Admin panel  →  {C}http://{local_ip}:{PORT}/pages/admin.html{X}")
    print()
    print(f"  {Y}⚠️   Bir xil WiFi ga ulanganlar kira oladi{X}")
    print(f"  🛑  To'xtatish uchun: {B}Ctrl + C{X}")
    print()
    print(f"{B}{'=' * 54}{X}")
    print("  Kirishlar:")
    print()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
        print()
        print(f"  🛑  Server to'xtatildi.")
        print()
