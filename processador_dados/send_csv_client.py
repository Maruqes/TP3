import json
import socket
import sys
import time


HOST = "127.0.0.1"
PORT = 9000


def main():
    if len(sys.argv) < 2:
        print("Usage: python send_csv_client.py path_to_csv")
        return

    csv_path = sys.argv[1]
    mapper_json = {
        "root": "books",
        "item": "book",
        "schema": {
            "title": "title",
            "authors": "authors",
            "publisher": "publisher",
            "language": "language",
            "ISBN": {
                "isbn_10": "isbn_10",
                "isbn_13": "isbn_13",
            },
        },
    }

    header = {
        "request_id": "1",
        "mapper": mapper_json,
        "webhook_url": "https://example.com/webhook",
        "filename": csv_path.split("\\")[-1].split("/")[-1],
    }

    with socket.create_connection((HOST, PORT)) as conn:
        conn.sendall(json.dumps(header).encode("utf-8") + b"\n")
        with open(csv_path, "r", encoding="utf-8") as handle:
            for line in handle:
                conn.sendall(line.rstrip("\n").encode("utf-8") + b"\n")



if __name__ == "__main__":
    main()
