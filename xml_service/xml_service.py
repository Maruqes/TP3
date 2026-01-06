import socket
import threading

from xml_processor import handle_client, start_worker


HOST = "0.0.0.0"
PORT = 9000


def main():
    start_worker()
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind((HOST, PORT))
        server.listen(1)
        server.settimeout(1.0)
        print(f"Active on {HOST}:{PORT}")
        try:
            while True:
                try:
                    conn, addr = server.accept()
                except socket.timeout:
                    continue
                thread = threading.Thread(
                    target=handle_client, args=(conn, addr), daemon=True
                )
                thread.start()
        except KeyboardInterrupt:
            print("closed")


if __name__ == "__main__":
    main()
