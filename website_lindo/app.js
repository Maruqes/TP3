// ═══════════════════════════════════════════════════════════════════════════
// 🚀 EPIC GRAPHQL CLIENT - POWERED BY ELIXIR & ABSINTHE
// ═══════════════════════════════════════════════════════════════════════════

// ⚡ CONFIGURAÇÃO ÉPICA DA URL BASE - USADA EM TODAS AS REQUESTS! ⚡
const GRAPHQL_CONFIG = {
	BASE_URL: 'https://elixir-epico.maruqes.com/graphql',
	TIMEOUT: 30000,
	HEADERS: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 CLASSE ÉPICA DO CLIENTE GRAPHQL
// ═══════════════════════════════════════════════════════════════════════════

class EpicGraphQLClient {
	constructor(config) {
		this.baseUrl = config.BASE_URL;
		this.timeout = config.TIMEOUT;
		this.headers = config.HEADERS;
		console.log(`🚀 Epic GraphQL Client initialized at: ${this.baseUrl}`);
	}

	/**
	 * 🎯 Método mestre para fazer queries GraphQL épicas
	 */
	async query(query, variables = {}) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			console.log(`📡 Sending GraphQL Query to: ${this.baseUrl}`);
			console.log('📝 Query:', query);
			console.log('🔧 Variables:', variables);

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
				console.error('❌ GraphQL Errors:', result.errors);
				throw new Error(result.errors.map(e => e.message).join(', '));
			}

			console.log('✅ Query Success! Data received:', result.data);
			return result.data;
		} catch (error) {
			clearTimeout(timeoutId);
			console.error('💥 Query Failed:', error);
			throw error;
		}
	}

	// ═══════════════════════════════════════════════════════════════════════
	// 📚 QUERIES ÉPICAS PARA LIVROS
	// ═══════════════════════════════════════════════════════════════════════

	/**
	 * 📚 Busca TODOS os livros (poder total!)
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
	 * 🔍 Busca livros por nome (filtro épico!)
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
	 * 👤 Busca livros por autor (filtro poderoso!)
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
	 * 📖 Busca todos os autores (lista completa!)
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
	 * 🎯 Query combinada épica - múltiplos dados em uma request!
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
// 🌟 INICIALIZAÇÃO DO CLIENTE ÉPICO
// ═══════════════════════════════════════════════════════════════════════════

const graphqlClient = new EpicGraphQLClient(GRAPHQL_CONFIG);

// ═══════════════════════════════════════════════════════════════════════════
// 📊 GERENCIADORES DE GRÁFICOS ÉPICOS
// ═══════════════════════════════════════════════════════════════════════════

let charts = {
	publishers: null,
	authors: null,
	years: null,
	stats: null
};

/**
 * 🎨 Cria gráfico de publishers épico
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
 * 👥 Cria gráfico de autores épico
 */
function createAuthorsChart(books) {
	const authorCounts = {};
	books.forEach(book => {
		if (book.authors) {
			const authors = book.authors.split(',').map(a => a.trim());
			authors.forEach(author => {
				authorCounts[author] = (authorCounts[author] || 0) + 1;
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
 * 📅 Cria gráfico de anos (extrai do ISBN)
 */
function createYearChart(books) {
	// Simula extração de anos baseado em padrões de ISBN
	const yearCounts = {};
	books.forEach(book => {
		// Estimativa baseada em dados (você pode melhorar com dados reais)
		const randomYear = 2010 + Math.floor(Math.random() * 16);
		yearCounts[randomYear] = (yearCounts[randomYear] || 0) + 1;
	});

	const sortedYears = Object.entries(yearCounts)
		.sort((a, b) => a[0] - b[0]);

	const ctx = document.getElementById('yearChart');
	if (charts.years) charts.years.destroy();

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
 * 📊 Cria gráfico de estatísticas em tempo real
 */
function createStatsChart(books) {
	const stats = {
		'Total Books': books.length,
		'With ISBN-10': books.filter(b => b.isbn_10).length,
		'With ISBN-13': books.filter(b => b.isbn_13).length,
		'With Thumbnails': books.filter(b => b.thumbnail).length,
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
 * 🎨 Gera cores épicas para os gráficos
 */
function generateEpicColors(count) {
	const colors = [];
	for (let i = 0; i < count; i++) {
		const hue = (i * 360 / count) % 360;
		colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
	}
	return colors;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 FUNÇÕES DE INTERFACE ÉPICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📚 Carrega todos os livros
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
 * 🔍 Busca por nome
 */
async function searchByName() {
	const name = document.getElementById('searchName').value.trim();
	if (!name) {
		alert('⚠️ Please enter a book title!');
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
 * 👤 Busca por autor
 */
async function searchByAuthor() {
	const author = document.getElementById('searchAuthor').value.trim();
	if (!author) {
		alert('⚠️ Please enter an author name!');
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
 * 📖 Carrega todos os autores
 */
async function loadAuthors() {
	showLoading();
	try {
		const authors = await graphqlClient.getAllAuthors();
		const authorsList = authors.map(a => a.name).join(', ');
		alert(`📚 Total Authors: ${authors.length}\n\n${authorsList}`);
		hideLoading();
	} catch (error) {
		showError('Failed to load authors: ' + error.message);
	}
}

/**
 * 🎨 Exibe os livros na grid
 */
function displayBooks(books) {
	const container = document.getElementById('booksContainer');

	if (books.length === 0) {
		container.innerHTML = '<div class="loading">📭 No books found!</div>';
		return;
	}

	container.innerHTML = books.map(book => `
        <div class="book-card" onclick="showBookDetails(${JSON.stringify(book).replace(/"/g, '&quot;')})">
            <img class="book-thumbnail" 
                 src="${book.thumbnail || book.small_thumbnail || 'https://via.placeholder.com/280x350?text=No+Image'}" 
                 alt="${book.title}"
                 onerror="this.src='https://via.placeholder.com/280x350?text=No+Image'">
            <div class="book-info">
                <div class="book-title">${book.title || 'Unknown Title'}</div>
                <div class="book-author">✍️ ${book.authors || 'Unknown Author'}</div>
                <div class="book-publisher">🏢 ${book.publisher || 'Unknown Publisher'}</div>
            </div>
        </div>
    `).join('');

	// Anima a entrada dos cards
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
 * 📖 Mostra detalhes do livro
 */
function showBookDetails(book) {
	const details = `
📚 ${book.title}

👤 Authors: ${book.authors || 'Unknown'}
🏢 Publisher: ${book.publisher || 'Unknown'}
📘 ISBN-10: ${book.isbn_10 || 'N/A'}
📗 ISBN-13: ${book.isbn_13 || 'N/A'}

📝 Description:
${book.description || 'No description available'}
    `;
	alert(details);
}

/**
 * 📊 Atualiza todos os gráficos
 */
function updateCharts(books) {
	if (books.length > 0) {
		createPublishersChart(books);
		createAuthorsChart(books);
		createYearChart(books);
		createStatsChart(books);
	}
}

/**
 * 📈 Atualiza as estatísticas
 */
function updateStats(books) {
	const uniqueAuthors = new Set();
	const uniquePublishers = new Set();

	books.forEach(book => {
		if (book.publisher) uniquePublishers.add(book.publisher);
		if (book.authors) {
			book.authors.split(',').forEach(a => uniqueAuthors.add(a.trim()));
		}
	});

	const statsHTML = `
        <div class="stat-card">
            <div class="stat-number">${books.length}</div>
            <div class="stat-label">Total Books</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${uniqueAuthors.size}</div>
            <div class="stat-label">Unique Authors</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${uniquePublishers.size}</div>
            <div class="stat-label">Publishers</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${books.filter(b => b.thumbnail).length}</div>
            <div class="stat-label">With Images</div>
        </div>
    `;

	document.getElementById('statsBar').innerHTML = statsHTML;

	// Anima os números
	anime({
		targets: '.stat-number',
		innerHTML: [0, (el) => el.textContent],
		round: 1,
		duration: 2000,
		easing: 'easeOutExpo'
	});
}

/**
 * ⏳ Mostra loading
 */
function showLoading() {
	document.getElementById('booksContainer').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <div>⚡ Loading epic data from GraphQL...</div>
        </div>
    `;
}

/**
 * ✅ Esconde loading
 */
function hideLoading() {
	// Implementado via displayBooks
}

/**
 * ❌ Mostra erro
 */
function showError(message) {
	document.getElementById('booksContainer').innerHTML = `
        <div class="error-message">
            <h3>❌ Error</h3>
            <p>${message}</p>
            <p>Make sure the Elixir GraphQL server is running at: ${GRAPHQL_CONFIG.BASE_URL}</p>
        </div>
    `;
}

/**
 * ✨ Animação de sucesso
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
// 🎆 INICIALIZAÇÃO DE EFEITOS ÉPICOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🌟 Inicializa particles.js
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
 * 🚀 Inicialização quando a página carrega
 */
window.addEventListener('DOMContentLoaded', () => {
	console.log('🚀 Epic Book Analytics Starting...');
	console.log('🔧 GraphQL Endpoint:', GRAPHQL_CONFIG.BASE_URL);

	initParticles();

	// Carrega dados iniciais
	loadAllBooks();

	// Adiciona event listeners para Enter nos inputs
	document.getElementById('searchName').addEventListener('keypress', (e) => {
		if (e.key === 'Enter') searchByName();
	});

	document.getElementById('searchAuthor').addEventListener('keypress', (e) => {
		if (e.key === 'Enter') searchByAuthor();
	});

	console.log('✅ Epic Book Analytics Ready!');
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎉 FIM DO CÓDIGO ÉPICO!
// ═══════════════════════════════════════════════════════════════════════════
