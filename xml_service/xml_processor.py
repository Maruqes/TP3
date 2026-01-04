import csv
import json
import os
import socket
import xml.etree.ElementTree as ET
import lxml.etree as etree

from db_connection import connect, ensure_schema, insert_xml_document

BUFFER_SIZE = 1024
XSD_PATH = os.path.join(os.path.dirname(__file__), "books.xsd")
MAPPER_VERSION = "v1"


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

        output_name = os.path.splitext(filename)[0] + ".xml"
        row_count = stream_csv_to_xml(lines, mapper, output_name)
        print(f"Processed {row_count} rows -> {output_name}")
        print("XML generation complete")
        is_valid, message = validate_xml(output_name)
        if is_valid:
            print(f"XML validated against {XSD_PATH}")
            
            with connect() as conn:
                ensure_schema(conn)
                with open(output_name, "r", encoding="utf-8") as handle:
                    xml_text = handle.read()
                row_id = insert_xml_document(conn, xml_text, MAPPER_VERSION)
            print(f"Inserted XML into database with id {row_id}")
        else:
            print(f"XML validation failed: {message}")
