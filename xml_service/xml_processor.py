import csv
import json
import os
import queue
import socket
import threading
import urllib.request
import xml.etree.ElementTree as ET
import lxml.etree as etree

from db_connection import connect, ensure_schema, insert_xml_document

BUFFER_SIZE = 1024
BASE_DIR = os.path.dirname(__file__)
XSD_PATH = os.path.join(BASE_DIR, "books.xsd")
MAPPER_VERSION = "v2"
PROCESSING_QUEUE = queue.Queue()
_WORKER_STARTED = False
_WORKER_LOCK = threading.Lock()


def read_lines(conn):
    buffer = b""
    while True:
        try:
            chunk = conn.recv(BUFFER_SIZE)
        except socket.timeout:
            continue
        if not chunk:
            if buffer:
                yield buffer.decode("utf-8", errors="replace")
            return
        buffer += chunk
        while b"\n" in buffer:
            line, buffer = buffer.split(b"\n", 1)
            text = line.decode("utf-8", errors="replace").rstrip("\r")
            if text == "endacabadofinalizadoanimalesco":
                return
            yield text


def apply_mapping(parent, mapping, row):
    for xml_key, map_value in mapping.items():
        if xml_key.startswith("@"):
            attr_name = xml_key[1:]
            value = row.get(map_value, map_value)
            parent.set(attr_name, value)
        elif isinstance(map_value, dict):
            child = ET.SubElement(parent, xml_key)
            apply_mapping(child, map_value, row)
        else:
            child = ET.SubElement(parent, xml_key)
            child.text = row.get(map_value, map_value)


def indent_xml(elem, level=0):
    indent = "\n" + ("  " * level)
    child_indent = "\n" + ("  " * (level + 1))
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = child_indent
        for child in elem:
            indent_xml(child, level + 1)
            if not child.tail or not child.tail.strip():
                child.tail = child_indent
        if not elem[-1].tail or not elem[-1].tail.strip():
            elem[-1].tail = indent
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = indent


def validate_xml(xml_path):
    schema_doc = etree.parse(XSD_PATH)
    schema = etree.XMLSchema(schema_doc)
    try:
        for _, elem in etree.iterparse(xml_path, events=("end",), schema=schema):
            elem.clear()
        return True, ""
    except etree.XMLSyntaxError as exc:
        return False, str(exc)


def stream_csv_to_xml(lines, mapper, output_name):
    row_count = 0
    with open(output_name, "w", encoding="utf-8", newline="") as handle:
        handle.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        handle.write(f"<{mapper['root']}>\n")
        reader = csv.DictReader(lines)
        for row in reader:
            if not any(value and value.strip() for value in row.values()):
                continue
            item = ET.Element(mapper["item"])
            apply_mapping(item, mapper["schema"], row)
            indent_xml(item, level=0)
            item_text = ET.tostring(item, encoding="unicode")
            for line in item_text.splitlines():
                handle.write(f"  {line}\n")
            row_count += 1
        handle.write(f"</{mapper['root']}>\n")
    return row_count


def ensure_unique_path(path):
    if not os.path.exists(path):
        return path
    base, ext = os.path.splitext(path)
    counter = 1
    while True:
        candidate = f"{base}_{counter}{ext}"
        if not os.path.exists(candidate):
            return candidate
        counter += 1


def build_csv_path(filename, request_id):
    base_name = os.path.basename(filename or "output.csv")
    stem, ext = os.path.splitext(base_name)
    if not ext:
        ext = ".csv"
    if request_id:
        safe_request_id = str(request_id).replace(os.path.sep, "_")
        base_name = f"{stem}_{safe_request_id}{ext}"
    path = os.path.join(BASE_DIR, base_name)
    return ensure_unique_path(path)


def receive_csv_file(lines, csv_path):
    line_count = 0
    with open(csv_path, "w", encoding="utf-8", newline="") as handle:
        for line in lines:
            handle.write(line)
            handle.write("\n")
            line_count += 1
    return line_count


def send_webhook(webhook_url, payload):
    if not webhook_url:
        return
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            response.read()
        print(f"Webhook sent to {webhook_url}")
    except Exception as exc:
        print(f"Failed to send webhook to {webhook_url}: {exc}")


def process_job(job):
    request_id = job.get("request_id")
    mapper = job["mapper"]
    csv_path = job["csv_path"]
    output_name = job["output_name"]
    webhook_url = job.get("webhook_url")

    print(f"Processing request {request_id} from {csv_path}")
    with open(csv_path, "r", encoding="utf-8", newline="") as handle:
        row_count = stream_csv_to_xml(handle, mapper, output_name)
    print(f"Processed {row_count} rows -> {output_name}")
    print("XML generation complete")
    is_valid, message = validate_xml(output_name)
    if is_valid:
        print(f"XML validated against {XSD_PATH}")
        try:
            with connect() as conn:
                ensure_schema(conn)
                with open(output_name, "r", encoding="utf-8") as handle:
                    xml_text = handle.read()
                row_id = insert_xml_document(conn, xml_text, MAPPER_VERSION)
        except Exception as exc:
            print(f"Database insertion failed: {exc}")
            send_webhook(
                webhook_url,
                {"status": "ERRO_PERSISTENCIA", "request_id": request_id, "row_id": None},
            )
            return

        print(f"Inserted XML into database with id {row_id}")
        send_webhook(webhook_url, {"status": "OK", "request_id": request_id, "row_id": row_id})
    else:
        print(f"XML validation failed: {message}")
        send_webhook(webhook_url, {"status": "ERRO_VALIDACAO", "request_id": request_id, "row_id": None})




def queue_worker():
    while True:
        job = PROCESSING_QUEUE.get()
        queue_size = PROCESSING_QUEUE.qsize()
        print(
            f"Dequeued request {job.get('request_id')}. Queue size: {queue_size}"
        )
        try:
            process_job(job)
        except Exception as exc:
            print(f"Failed processing request {job.get('request_id')}: {exc}")
        finally:
            PROCESSING_QUEUE.task_done()


def start_worker():
    global _WORKER_STARTED
    with _WORKER_LOCK:
        if _WORKER_STARTED:
            return
        worker = threading.Thread(target=queue_worker, daemon=True)
        worker.start()
        _WORKER_STARTED = True


def enqueue_job(job):
    PROCESSING_QUEUE.put(job)
    queue_size = PROCESSING_QUEUE.qsize()
    print(f"Queued request {job.get('request_id')}. Queue size: {queue_size}")


def handle_client(conn, addr):
    print(f"Connection from {addr}")
    with conn:
        conn.settimeout(1.0)
        lines = read_lines(conn)
        try:
            header_line = next(lines)
        except StopIteration:
            print("Stoped iteration")
            return

        try:
            header = json.loads(header_line)
        except json.JSONDecodeError:
            print("Invalid header JSON")
            return

        request_id = header.get("request_id")
        mapper = header.get("mapper")
        webhook_url = header.get("webhook_url")
        filename = header.get("filename", "output.csv")

        print(f"Request {request_id} mapper={mapper} webhook={webhook_url}")
        print(f"Receiving CSV lines for {filename}")

        if not isinstance(mapper, dict):
            print("Mapper is missing or invalid")
            return

        csv_path = build_csv_path(filename, request_id)
        output_name = os.path.splitext(csv_path)[0] + ".xml"
        print(f"Receiving CSV file for {filename} -> {csv_path}")
        receive_csv_file(lines, csv_path)
        print("Received CSV file, queued for processing")
        enqueue_job(
            {
                "request_id": request_id,
                "mapper": mapper,
                "csv_path": csv_path,
                "output_name": output_name,
                "webhook_url": webhook_url,
            }
        )
