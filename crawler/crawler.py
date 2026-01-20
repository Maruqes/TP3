import csv
import datetime
import os
import re
import ssl
import time
import unicodedata
from urllib.parse import urljoin, urlparse
import boto3
import requests
from bs4 import BeautifulSoup
import pika

DEFAULT_URL = "https://freecomputerbooks.com/compscArtificialIntelligenceBooks.html"
OUTPUT_CSV = f"books_{datetime.date.today().isoformat()}.csv"
LIMIT_BOOKS = 0


SLEEP_SECONDS = 0


FIELDNAMES = [
    "title",
    "authors",
    "publisher",
    "language",
    "isbn_10",
    "isbn_13",
]


LABEL_MAP = {
    "title": "title",
    "author(s)": "authors",
    "authors": "authors",
    "publisher": "publisher",
    "language": "language",
    "isbn-10/asin": "isbn_10",
    "isbn-10": "isbn_10",
    "isbn 10": "isbn_10",
    "isbn-13": "isbn_13",
    "isbn 13": "isbn_13",
}


def normalize_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


def normalize_label(text):
    text = normalize_text(text).rstrip(":")
    ascii_text = (
        unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    )
    return ascii_text.lower()


def fetch_html(session, url):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
    }
    for attempt in range(2):
        response = session.get(url, headers=headers, timeout=30)
        if response.status_code != 403 or attempt == 1:
            response.raise_for_status()
            return response.text
        time.sleep(1.0)


def extract_product_links(soup, base_url):
    links = set()
    base_netloc = urlparse(base_url).netloc
    for anchor in soup.select("a[href]"):
        href = anchor.get("href", "")
        if not href or href.startswith("#"):
            continue
        absolute = urljoin(base_url, href.split("#")[0])
        parsed = urlparse(absolute)
        if parsed.netloc != base_netloc:
            continue
        if parsed.path.endswith(".html") and parsed.path != urlparse(base_url).path:
            links.add(absolute)
    return links


def collect_product_links(session, start_url, max_books=None):
    html = fetch_html(session, start_url)
    soup = BeautifulSoup(html, 'html.parser')
    sorted_links = sorted(extract_product_links(soup, start_url))
    if max_books:
        return sorted_links[:max_books]
    return sorted_links


def extract_detail_pairs(soup):
    details = {}

    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if not dd:
            continue
        label = normalize_label(dt.get_text(" ", strip=True))
        if label in LABEL_MAP:
            details[LABEL_MAP[label]] = normalize_text(dd.get_text(" ", strip=True))

    for li in soup.find_all("li"):
        bold = li.find(["b", "strong"])
        if not bold:
            continue
        raw_label = normalize_text(bold.get_text(" ", strip=True)).rstrip(":")
        label = normalize_label(raw_label)
        key = LABEL_MAP.get(label)
        if not key:
            continue
        value_text = normalize_text(li.get_text(" ", strip=True))
        value = re.sub(
            rf"^{re.escape(raw_label)}\s*:?\s*",
            "",
            value_text,
            flags=re.IGNORECASE,
        ).strip()
        if value and key not in details:
            details[key] = value

    for element in soup.find_all(["p", "span", "div"]):
        text = normalize_text(element.get_text(" ", strip=True))
        if ":" not in text:
            continue
        label, value = text.split(":", 1)
        key = LABEL_MAP.get(normalize_label(label))
        if key and key not in details:
            details[key] = normalize_text(value)

    return details


def extract_book_details(session, url):
    html = fetch_html(session, url)
    soup = BeautifulSoup(html, "html.parser")

    title = ""

    title_tag = soup.find("h1")
    if title_tag:
        title = normalize_text(title_tag.get_text(" ", strip=True))

    details = extract_detail_pairs(soup)

    book = {
        "title": title,
    }
    for field in FIELDNAMES:
        if field not in book or not book[field]:
            book[field] = details.get(field, "")
    if not any(book.values()):
        return None
    return book


def write_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    env_path = os.path.abspath(env_path)
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def get_env(name, required=True, default=None):
    value = os.getenv(name, default)
    if value == "":
        value = default
    if required and not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def upload_to_supabase_bucket(path, bucket, object_key):


    load_env_file()
    s3_endpoint = get_env("S3_ENDPOINT")
    s3_region = get_env("S3_REGION")
    s3_access_key = get_env("S3_ACCESS_KEY")
    s3_secret_key = get_env("S3_SECRET_KEY")

    client = boto3.client(
        "s3",
        region_name=s3_region,
        endpoint_url=s3_endpoint,
        aws_access_key_id=s3_access_key,
        aws_secret_access_key=s3_secret_key,
    )
    client.upload_file(path, bucket, object_key)


def notify_rabbitmq(filename):

    load_env_file()
    rabbit_url = get_env("RABBIT_URL")
    rabbit_queue = get_env("RABBIT_QUEUE")
    reject_unauthorized = get_env(
        "RABBIT_REJECT_UNAUTHORIZED", required=False, default="false"
    )
    verify_certs = reject_unauthorized.lower() not in {"0", "false", "no"}

    params = pika.URLParameters(rabbit_url)
    if rabbit_url.startswith("amqps://"):
        context = ssl.create_default_context()
        if not verify_certs:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        params.ssl_options = pika.SSLOptions(context)

    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.queue_declare(queue=rabbit_queue, durable=True)
    channel.basic_publish(
        exchange="",
        routing_key=rabbit_queue,
        body=filename.encode("utf-8"),
        properties=pika.BasicProperties(delivery_mode=2),
    )
    channel.close()
    connection.close()


def main():
    session = requests.Session()

    product_links = collect_product_links(
        session, DEFAULT_URL, max_books=LIMIT_BOOKS or None
    )
    if not product_links:
        print("No product links found. Check the category URL or selectors.")
        return

    rows = []
    for index, link in enumerate(product_links, start=1):
        try:
            book = extract_book_details(session, link)
            if book:
                rows.append(book)
            time.sleep(SLEEP_SECONDS)
        except requests.RequestException as exc:
            print(f"[{index}/{len(product_links)}] Failed {link}: {exc}")

    write_csv(OUTPUT_CSV, rows)
    print(f"Saved {len(rows)} books to {OUTPUT_CSV}")
    load_env_file()
    s3_bucket = get_env("S3_BUCKET")
    s3_object_key = get_env("S3_OBJECT_KEY", required=False, default=OUTPUT_CSV)
    upload_to_supabase_bucket(OUTPUT_CSV, s3_bucket, s3_object_key)
    print(f"Uploaded {OUTPUT_CSV} to bucket {s3_bucket} as {s3_object_key}")
    notify_rabbitmq(s3_object_key)
    print(f"Notified RabbitMQ with filename {s3_object_key}")


if __name__ == "__main__":
    main()
