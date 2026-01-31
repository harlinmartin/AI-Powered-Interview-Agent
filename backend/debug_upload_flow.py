import requests
import sys

BASE_URL = "http://localhost:8000"

def run_debug():
    # 1. Register/Login
    email = "debug_upload_user@example.com"
    password = "password123"
    
    print(f"1. Authenticating as {email}...")
    # Try register
    requests.post(f"{BASE_URL}/register", json={"email": email, "password": password, "full_name": "Debug User"})
    
    # Login
    resp = requests.post(f"{BASE_URL}/login", data={"username": email, "password": password})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json()["access_token"]
    print("   Login successful.")
    
    # 2. Upload File
    print("2. Uploading PDF...")
    
    import io
    from pypdf import PdfWriter
    
    # Create valid dummy PDF
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    pdf_bytes = io.BytesIO()
    writer.write(pdf_bytes)
    pdf_bytes.seek(0)
    
    headers = {"Authorization": f"Bearer {token}"}
    files = {"resume": ("dummy.pdf", pdf_bytes, "application/pdf")}
    data = {"job_description": "Software Engineer"}
    
    try:
        resp = requests.post(f"{BASE_URL}/interview/upload", headers=headers, files=files, data=data)
        print(f"   Response Status: {resp.status_code}")
        print(f"   Response Body: {resp.text}")
    except Exception as e:
        print(f"   Request failed: {e}")

if __name__ == "__main__":
    run_debug()
