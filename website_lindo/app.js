// ═══════════════════════════════════════════════════════════════════════════
// EPIC GRAPHQL CLIENT - POWERED BY ELIXIR & ABSINTHE
// ═══════════════════════════════════════════════════════════════════════════

// BASE URL CONFIG - USED IN ALL REQUESTS
const GRAPHQL_CONFIG = {
	BASE_URL: 'https://elixir-epico.maruqes.com/graphql',
	TIMEOUT: 30000,
	HEADERS: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
};

// ═══════════════════════════════════════════════════════════════════════════
// GRAPHQL CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════

class EpicGraphQLClient {
	constructor(config) {
		this.baseUrl = config.BASE_URL;
		this.timeout = config.TIMEOUT;
		this.headers = config.HEADERS;
		console.log(`GraphQL client initialized at: ${this.baseUrl}`);
	}

	/**
	 * Main method to run GraphQL queries
	 */
	async query(query, variables = {}) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			console.log(`Sending GraphQL query to: ${this.baseUrl}`);
			console.log('Query:', query);
			console.log('Variables:', variables);

			const response = await fetch(this.baseUrl, {
				method: 'POST',
				headers: this.headers,
				body: JSON.stringify({ query, variables }),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP Error! Status: ${response.status}`);
			}

			const result = await response.json();

			if (result.errors) {
				console.error('GraphQL errors:', result.errors);
				throw new Error(result.errors.map(e => e.message).join(', '));
			}

			console.log('Query success. Data received:', result.data);
			return result.data;
		} catch (error) {
			clearTimeout(timeoutId);
			console.error('Query failed:', error);
			throw error;
		}
	}

	// ═══════════════════════════════════════════════════════════════════════
	// BOOK QUERIES
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * Fetch all books
	 */
	async getAllBooks() {
		const query = `
            query GetAllBooks {
                books {
                    title
                    authors
                    publisher
                    isbn_10
                    isbn_13
                    description
                    small_thumbnail
                    thumbnail
                }
            }
        `;
		const data = await this.query(query);
		return data.books || [];
	}

	/**
	 * Search books by name
	 */
	async searchBooksByName(name) {
		const query = `
            query SearchByName($name: String!) {
                search_by_name(name: $name) {
                    title
                    authors
                    publisher
                    isbn_10
                    isbn_13
                    description
                    small_thumbnail
                    thumbnail
                }
            }
        `;
		const data = await this.query(query, { name });
		return data.search_by_name || [];
	}

	/**
	 * Search books by author
	 */
	async searchBooksByAuthor(author) {
		const query = `
            query SearchByAuthor($author: String!) {
                search_by_author(author: $author) {
                    title
                    authors
                    publisher
                    isbn_10
                    isbn_13
                    description
                    small_thumbnail
                    thumbnail
                }
            }
        `;
		const data = await this.query(query, { author });
		return data.search_by_author || [];
	}

	/**
	 * Fetch all authors
	 */
	async getAllAuthors() {
		const query = `
            query GetAuthors {
                get_authors {
                    name
                }
            }
        `;
		const data = await this.query(query);
		return data.get_authors || [];
	}

	/**
	 * Combined query for multiple datasets
	 */
	async getCombinedData() {
		const query = `
            query EpicCombinedQuery {
                books {
                    title
                    authors
                    publisher
                    thumbnail
                }
                get_authors {
                    name
                }
            }
        `;
		const data = await this.query(query);
		return {
			books: data.books || [],
			authors: data.get_authors || []
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const graphqlClient = new EpicGraphQLClient(GRAPHQL_CONFIG);

// ═══════════════════════════════════════════════════════════════════════════
// CHART MANAGERS
// ═══════════════════════════════════════════════════════════════════════════

let charts = {
	publishers: null,
	authors: null,
	years: null,
	stats: null
};

let currentBooks = [];
let currentAuthors = [];
let selectedAuthors = new Set();
let authorSearchToken = 0;
const FALLBACK_THUMBNAIL_BASE = 'https://picsum.photos/seed';

/**
 * Create publishers chart
 */
function createPublishersChart(books) {
	const publisherCounts = {};
	books.forEach(book => {
		const publisher = book.publisher || 'Unknown';
		publisherCounts[publisher] = (publisherCounts[publisher] || 0) + 1;
	});

	const sortedPublishers = Object.entries(publisherCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	const ctx = document.getElementById('publishersChart');
	if (charts.publishers) charts.publishers.destroy();

	charts.publishers = new Chart(ctx, {
		type: 'doughnut',
		data: {
			labels: sortedPublishers.map(p => p[0]),
			datasets: [{
				data: sortedPublishers.map(p => p[1]),
				backgroundColor: generateEpicColors(sortedPublishers.length),
				borderColor: '#00ff88',
				borderWidth: 2
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: 'right',
					labels: { color: '#e0e0e0', font: { size: 11 } }
				},
				title: {
					display: true,
					text: 'Top 10 Publishers',
					color: '#00ff88',
					font: { size: 16, weight: 'bold' }
				}
			}
		}
	});
}

/**
 * Create authors chart
 */
function createAuthorsChart(books) {
	const authorCounts = {};
	books.forEach(book => {
		if (book.authors) {
			const authors = Array.isArray(book.authors)
				? book.authors.map(author => String(author).trim())
				: book.authors.split(',').map(a => a.trim());
			authors.forEach(author => {
				if (author) authorCounts[author] = (authorCounts[author] || 0) + 1;
			});
		}
	});

	const topAuthors = Object.entries(authorCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	const ctx = document.getElementById('authorsChart');
	if (charts.authors) charts.authors.destroy();

	charts.authors = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: topAuthors.map(a => a[0]),
			datasets: [{
				label: 'Number of Books',
				data: topAuthors.map(a => a[1]),
				backgroundColor: 'rgba(0, 255, 136, 0.6)',
				borderColor: '#00ff88',
				borderWidth: 2
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			indexAxis: 'y',
			plugins: {
				legend: { display: false },
				title: {
					display: true,
					text: 'Most Prolific Authors',
					color: '#00ff88',
					font: { size: 16, weight: 'bold' }
				}
			},
			scales: {
				x: {
					ticks: { color: '#e0e0e0' },
					grid: { color: 'rgba(0, 255, 136, 0.1)' }
				},
				y: {
					ticks: { color: '#e0e0e0', font: { size: 10 } },
					grid: { display: false }
				}
			}
		}
	});
}

/**
 * Create year chart (extracted from content)
 */
function createYearChart(books) {
	const yearCounts = {};
	books.forEach(book => {
		const year = extractYear(book);
		if (!year) return;
		yearCounts[year] = (yearCounts[year] || 0) + 1;
	});

	const sortedYears = Object.entries(yearCounts)
		.sort((a, b) => a[0] - b[0]);

	const ctx = document.getElementById('yearChart');
	if (charts.years) charts.years.destroy();
	if (sortedYears.length === 0) {
		charts.years = null;
		return;
	}

	charts.years = new Chart(ctx, {
		type: 'line',
		data: {
			labels: sortedYears.map(y => y[0]),
			datasets: [{
				label: 'Books Published',
				data: sortedYears.map(y => y[1]),
				borderColor: '#00d9ff',
				backgroundColor: 'rgba(0, 217, 255, 0.2)',
				borderWidth: 3,
				fill: true,
				tension: 0.4
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					labels: { color: '#e0e0e0' }
				},
				title: {
					display: true,
					text: 'Publication Timeline',
					color: '#00d9ff',
					font: { size: 16, weight: 'bold' }
				}
			},
			scales: {
				x: {
					ticks: { color: '#e0e0e0' },
					grid: { color: 'rgba(0, 217, 255, 0.1)' }
				},
				y: {
					ticks: { color: '#e0e0e0' },
					grid: { color: 'rgba(0, 217, 255, 0.1)' }
				}
			}
		}
	});
}

/**
 * Create real-time stats chart
 */
function createStatsChart(books) {
	const stats = {
		'Total Books': books.length,
		'With ISBN-10': books.filter(b => b.isbn_10).length,
		'With ISBN-13': books.filter(b => b.isbn_13).length,
		'With Thumbnails': books.filter(hasThumbnail).length,
		'With Description': books.filter(b => b.description).length
	};

	const ctx = document.getElementById('statsChart');
	if (charts.stats) charts.stats.destroy();

	charts.stats = new Chart(ctx, {
		type: 'radar',
		data: {
			labels: Object.keys(stats),
			datasets: [{
				label: 'Statistics',
				data: Object.values(stats),
				backgroundColor: 'rgba(0, 255, 136, 0.2)',
				borderColor: '#00ff88',
				borderWidth: 3,
				pointBackgroundColor: '#00ff88',
				pointBorderColor: '#fff',
				pointHoverBackgroundColor: '#fff',
				pointHoverBorderColor: '#00ff88'
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: { display: false },
				title: {
					display: true,
					text: 'Data Completeness Radar',
					color: '#00ff88',
					font: { size: 16, weight: 'bold' }
				}
			},
			scales: {
				r: {
					ticks: { color: '#e0e0e0', backdropColor: 'transparent' },
					grid: { color: 'rgba(0, 255, 136, 0.2)' },
					pointLabels: { color: '#e0e0e0', font: { size: 11 } }
				}
			}
		}
	});
}

/**
 * Generate chart colors
 */
function generateEpicColors(count) {
	const colors = [];
	for (let i = 0; i < count; i++) {
		const hue = (i * 360 / count) % 360;
		colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
	}
	return colors;
}

function formatAuthors(authors) {
	if (Array.isArray(authors)) return authors.join(', ');
	if (typeof authors === 'string' && authors.trim()) return authors.trim();
	return 'Unknown author';
}

function getFallbackThumbnail(book, index = 0) {
	const seedSource = [book.isbn_13, book.isbn_10, book.title, `book-${index}`]
		.filter(Boolean)
		.join('-');
	const seed = encodeURIComponent(seedSource || `book-${index}`);
	return `${FALLBACK_THUMBNAIL_BASE}/${seed}/280/350`;
}

function getThumbnailUrl(book, fallbackUrl) {
	const raw = [book.thumbnail, book.small_thumbnail].find(value => typeof value === 'string' && value.trim());
	return raw ? raw.trim() : (fallbackUrl || getFallbackThumbnail(book));
}

function hasThumbnail(book) {
	return [book.thumbnail, book.small_thumbnail].some(value => typeof value === 'string' && value.trim());
}

function extractYear(book) {
	const fields = [book.description, book.title].filter(Boolean).join(' ');
	const match = fields.match(/\b(19|20)\d{2}\b/);
	return match ? Number(match[0]) : null;
}

function clearCharts() {
	Object.values(charts).forEach(chart => {
		if (chart) chart.destroy();
	});
	charts = { publishers: null, authors: null, years: null, stats: null };
}

function openModal(modal) {
	modal.classList.remove('hidden');
	document.body.classList.add('overflow-hidden');
}

function closeModal(modal) {
	modal.classList.add('hidden');
	if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
		document.body.classList.remove('overflow-hidden');
	}
}

function closeAllModals() {
	document.querySelectorAll('.modal-overlay').forEach(modal => closeModal(modal));
}

function renderAuthorsModal(authors) {
	const modal = document.getElementById('authorsModal');
	const list = document.getElementById('authorsModalList');
	const count = document.getElementById('authorsModalCount');
	const names = authors.map(author => author.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
	currentAuthors = authors;
	selectedAuthors.clear();
	updateAuthorsCountDisplay(names.length);
	list.innerHTML = names.length
		? names.map(name => `
			<li>
				<button type="button"
					class="author-option w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-slate-100 transition hover:border-emerald-300/60 hover:bg-emerald-300/10 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
					data-author="${encodeURIComponent(name)}">
					${name}
				</button>
			</li>
		`).join('')
		: '<li class="text-slate-300">No authors found.</li>';

	list.querySelectorAll('.author-option').forEach(button => {
		button.addEventListener('click', () => {
			const author = decodeURIComponent(button.dataset.author || '');
			if (!author) return;
			toggleAuthorSelection(author, button, names.length);
		});
	});

	openModal(modal);
}

async function fetchAuthorsCount() {
	if (currentAuthors.length > 0) return;
	try {
		currentAuthors = await graphqlClient.getAllAuthors();
		if (currentBooks.length > 0) {
			updateStats(currentBooks);
		}
	} catch (error) {
		console.warn('Failed to fetch authors:', error);
	}
}

function updateAuthorsCountDisplay(total) {
	const count = document.getElementById('authorsModalCount');
	const selected = selectedAuthors.size;
	count.textContent = selected > 0
		? `${total} authors • ${selected} selected`
		: `${total} authors`;
}

function toggleAuthorSelection(author, button, total) {
	if (selectedAuthors.has(author)) {
		selectedAuthors.delete(author);
		setAuthorSelected(button, false);
	} else {
		selectedAuthors.add(author);
		setAuthorSelected(button, true);
	}

	anime({
		targets: button,
		scale: [1, 1.03, 1],
		duration: 260,
		easing: 'easeOutQuad'
	});

	updateAuthorsCountDisplay(total);
	if (selectedAuthors.size > 0) {
		searchBySelectedAuthors();
	}
}

function setAuthorSelected(button, isSelected) {
	button.classList.toggle('border-emerald-300/70', isSelected);
	button.classList.toggle('bg-emerald-300/20', isSelected);
	button.classList.toggle('text-emerald-50', isSelected);
	button.classList.toggle('shadow-[0_0_0_1px_rgba(16,185,129,0.35)]', isSelected);
}

function getBookKey(book) {
	return book.isbn_13 || book.isbn_10 || `${book.title || 'unknown'}-${book.publisher || 'unknown'}`;
}

function mergeBooks(books) {
	const unique = new Map();
	books.forEach(book => {
		const key = getBookKey(book);
		if (!unique.has(key)) unique.set(key, book);
	});
	return Array.from(unique.values());
}

async function searchBySelectedAuthors() {
	const authors = Array.from(selectedAuthors);
	if (authors.length === 0) return;

	const token = ++authorSearchToken;
	showLoading();

	try {
		const results = await Promise.allSettled(
			authors.map(author => graphqlClient.searchBooksByAuthor(author))
		);

		if (token !== authorSearchToken) return;

		const books = [];
		const failedAuthors = [];

		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				books.push(...result.value);
			} else {
				failedAuthors.push(authors[index]);
			}
		});

		const merged = mergeBooks(books);
		displayBooks(merged);
		updateCharts(merged);
		updateStats(merged);
		animateSuccess();

		if (merged.length === 0 && failedAuthors.length > 0) {
			showError(`Failed to load books for: ${failedAuthors.join(', ')}`);
		}
	} catch (error) {
		showError('Failed to load selected authors: ' + error.message);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// UI FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load all books
 */
async function loadAllBooks() {
	showLoading();
	try {
		const books = await graphqlClient.getAllBooks();
		displayBooks(books);
		updateCharts(books);
		updateStats(books);
		animateSuccess();
	} catch (error) {
		showError('Failed to load books: ' + error.message);
	}
}

/**
 * Search by name
 */
async function searchByName() {
	const name = document.getElementById('searchName').value.trim();
	if (!name) {
		alert('Please enter a book title.');
		return;
	}

	showLoading();
	try {
		const books = await graphqlClient.searchBooksByName(name);
		displayBooks(books);
		updateCharts(books);
		updateStats(books);
		animateSuccess();
	} catch (error) {
		showError('Failed to search books: ' + error.message);
	}
}

/**
 * Search by author
 */
async function searchByAuthor() {
	const author = document.getElementById('searchAuthor').value.trim();
	if (!author) {
		alert('Please enter an author name.');
		return;
	}

	showLoading();
	try {
		const books = await graphqlClient.searchBooksByAuthor(author);
		displayBooks(books);
		updateCharts(books);
		updateStats(books);
		animateSuccess();
	} catch (error) {
		showError('Failed to search by author: ' + error.message);
	}
}

/**
 * Load all authors
 */
async function loadAuthors() {
	try {
		if (currentAuthors.length === 0) {
			currentAuthors = await graphqlClient.getAllAuthors();
		}
		renderAuthorsModal(currentAuthors);
		updateStats(currentBooks);
	} catch (error) {
		showError('Failed to load authors: ' + error.message);
	}
}

/**
 * Render books grid
 */
function displayBooks(books) {
	const container = document.getElementById('booksContainer');
	currentBooks = books;

	if (books.length === 0) {
		container.innerHTML = '<div class="loading">No books found.</div>';
		return;
	}

	container.innerHTML = books.map((book, index) => {
		const fallback = getFallbackThumbnail(book, index);
		return `
        <div class="book-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_15px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-2 hover:border-emerald-300/50 hover:shadow-[0_20px_50px_rgba(16,185,129,0.25)]" data-index="${index}">
            <img class="book-thumbnail h-72 w-full object-cover"
                 src="${getThumbnailUrl(book, fallback)}"
                 alt="${book.title || 'Untitled book'}"
                 onerror="this.onerror=null;this.src='${fallback}'">
            <div class="book-info p-4">
                <div class="book-title font-display text-lg text-emerald-200">${book.title || 'Unknown title'}</div>
                <div class="book-author text-slate-200/90">By ${formatAuthors(book.authors)}</div>
                <div class="book-publisher text-sm text-slate-300/80">Publisher: ${book.publisher || 'Unknown publisher'}</div>
            </div>
        </div>
    `;
	}).join('');

	container.querySelectorAll('.book-card').forEach(card => {
		card.addEventListener('click', () => {
			const book = currentBooks[Number(card.dataset.index)];
			if (book) showBookDetails(book);
		});
	});

	// Animate card entrance
	anime({
		targets: '.book-card',
		opacity: [0, 1],
		translateY: [50, 0],
		delay: anime.stagger(50),
		duration: 800,
		easing: 'easeOutExpo'
	});
}

/**
 * Show book details
 */
function showBookDetails(book) {
	const modal = document.getElementById('bookModal');
	document.getElementById('bookModalTitle').textContent = book.title || 'Unknown title';
	document.getElementById('bookModalAuthors').textContent = formatAuthors(book.authors);
	document.getElementById('bookModalPublisher').textContent = book.publisher || 'Unknown publisher';
	document.getElementById('bookModalIsbn10').textContent = book.isbn_10 || 'N/A';
	document.getElementById('bookModalIsbn13').textContent = book.isbn_13 || 'N/A';
	document.getElementById('bookModalDescription').textContent = book.description || 'No description available.';
	const image = document.getElementById('bookModalImage');
	const index = currentBooks.indexOf(book);
	const fallback = getFallbackThumbnail(book, index >= 0 ? index : 0);
	image.src = getThumbnailUrl(book, fallback);
	image.onerror = () => {
		image.onerror = null;
		image.src = fallback;
	};
	openModal(modal);
}

/**
 * Update all charts
 */
function updateCharts(books) {
	if (books.length === 0) {
		clearCharts();
		return;
	}
	createPublishersChart(books);
	createAuthorsChart(books);
	createYearChart(books);
	createStatsChart(books);
}

/**
 * Update stats
 */
function updateStats(books) {
	const uniquePublishers = new Set();

	books.forEach(book => {
		if (book.publisher) uniquePublishers.add(book.publisher);
	});
	const authorsCount = currentAuthors.length;

	const statsHTML = `
        <div class="stat-card rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-5 text-center">
            <div class="stat-number font-display text-3xl text-emerald-200">${books.length}</div>
            <div class="stat-label text-sm text-slate-200/80">Total books</div>
        </div>
        <div class="stat-card rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-5 text-center">
            <div class="stat-number font-display text-3xl text-emerald-200">${authorsCount}</div>
            <div class="stat-label text-sm text-slate-200/80">Unique authors</div>
        </div>
        <div class="stat-card rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-5 text-center">
            <div class="stat-number font-display text-3xl text-emerald-200">${uniquePublishers.size}</div>
            <div class="stat-label text-sm text-slate-200/80">Publishers</div>
        </div>
        <div class="stat-card rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-5 text-center">
            <div class="stat-number font-display text-3xl text-emerald-200">${books.filter(hasThumbnail).length}</div>
            <div class="stat-label text-sm text-slate-200/80">With image</div>
        </div>
    `;

	document.getElementById('statsBar').innerHTML = statsHTML;

	// Animate the numbers
	anime({
		targets: '.stat-number',
		innerHTML: [0, (el) => el.textContent],
		round: 1,
		duration: 2000,
		easing: 'easeOutExpo'
	});
}

/**
 * Show loading
 */
function showLoading() {
	document.getElementById('booksContainer').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>Loading data from GraphQL...</div>
        </div>
    `;
}

/**
 * Hide loading
 */
function hideLoading() {
	// Handled by displayBooks
}

/**
 * Show error
 */
function showError(message) {
	document.getElementById('booksContainer').innerHTML = `
        <div class="error-message">
            <h3>Error</h3>
            <p>${message}</p>
            <p>Make sure the GraphQL server is running at: ${GRAPHQL_CONFIG.BASE_URL}</p>
        </div>
    `;
}

/**
 * Success animation
 */
function animateSuccess() {
	anime({
		targets: '.chart-container',
		scale: [0.9, 1],
		opacity: [0, 1],
		delay: anime.stagger(100),
		duration: 600,
		easing: 'easeOutElastic(1, .8)'
	});
}

// ═══════════════════════════════════════════════════════════════════════════
// EFFECT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize particles.js
 */
function initParticles() {
	particlesJS('particles-js', {
		particles: {
			number: { value: 80, density: { enable: true, value_area: 800 } },
			color: { value: '#00ff88' },
			shape: { type: 'circle' },
			opacity: { value: 0.5, random: true },
			size: { value: 3, random: true },
			line_linked: {
				enable: true,
				distance: 150,
				color: '#00ff88',
				opacity: 0.4,
				width: 1
			},
			move: {
				enable: true,
				speed: 2,
				direction: 'none',
				random: false,
				straight: false,
				out_mode: 'out',
				bounce: false
			}
		},
		interactivity: {
			detect_on: 'canvas',
			events: {
				onhover: { enable: true, mode: 'repulse' },
				onclick: { enable: true, mode: 'push' },
				resize: true
			}
		},
		retina_detect: true
	});
}

/**
 * Initialize when the page loads
 */
window.addEventListener('DOMContentLoaded', () => {
	console.log('Book analytics starting...');
	console.log('GraphQL endpoint:', GRAPHQL_CONFIG.BASE_URL);

	initParticles();

	// Load initial data
	loadAllBooks();
	fetchAuthorsCount();

	// Add event listeners for Enter on inputs
	document.getElementById('searchName').addEventListener('keypress', (e) => {
		if (e.key === 'Enter') searchByName();
	});

	document.getElementById('searchAuthor').addEventListener('keypress', (e) => {
		if (e.key === 'Enter') searchByAuthor();
	});

	document.querySelectorAll('[data-modal-close]').forEach(button => {
		button.addEventListener('click', () => closeAllModals());
	});

	document.querySelectorAll('.modal-overlay').forEach(modal => {
		modal.addEventListener('click', (event) => {
			if (event.target === modal) closeModal(modal);
		});
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeAllModals();
	});

	console.log('Book analytics ready.');
});

// ═══════════════════════════════════════════════════════════════════════════
// END OF FILE
// ═══════════════════════════════════════════════════════════════════════════
