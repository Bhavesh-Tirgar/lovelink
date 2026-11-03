import requests
import json

BASE_URL = "http://localhost:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMGU2NmU5NC0zZjdiLTRkOGEtYmY4MC03MTRmM2JjZjMxNDciLCJleHAiOjE3NzM5NDY2Nzl9.8Ex8WUdjVGFKLkXoySJsGj5QT1qLcdx90LZrueWmfiE"

def test_initiate_call():
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "call_type": "video"
    }
    
    print(f"Sending request to {BASE_URL}/calls/initiate...")
    try:
        response = requests.post(f"{BASE_URL}/calls/initiate", headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        print(response.json())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_initiate_call()
