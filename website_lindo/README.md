# 🚀 EPIC BOOK ANALYTICS - GraphQL Power Demo

## ✨ Visão Geral

Um website **ÉPICO** e moderno que demonstra o poder total do GraphQL com Elixir (Absinthe), apresentando:

- 🎨 **Design futurista** com animações e efeitos de partículas
- 📊 **Gráficos interativos** em tempo real (Chart.js)
- ⚡ **Integração GraphQL** completa com o backend Elixir
- 🔍 **Filtros avançados** e queries múltiplas
- 🎯 **Arquitetura limpa** com variável base configurável

## 🎯 Funcionalidades

### 📡 Integração GraphQL Completa

O website usa uma **classe cliente GraphQL customizada** que se conecta ao servidor Elixir em `localhost:4000/graphql`:

```javascript
const GRAPHQL_CONFIG = {
    BASE_URL: 'http://localhost:4000/graphql',  // ⚡ URL BASE CONFIGURÁVEL!
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};
```

### 🔥 Queries Implementadas

O website demonstra **TODAS** as queries disponíveis no schema GraphQL do Elixir:

#### 1️⃣ **Buscar Todos os Livros**
```graphql
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
```

#### 2️⃣ **Buscar por Nome** (com filtro)
```graphql
query SearchByName($name: String!) {
    search_by_name(name: $name) {
        title
        authors
        publisher
        # ... todos os campos
    }
}
```

#### 3️⃣ **Buscar por Autor** (com filtro)
```graphql
query SearchByAuthor($author: String!) {
    search_by_author(author: $author) {
        title
        authors
        publisher
        # ... todos os campos
    }
}
```

#### 4️⃣ **Listar Todos os Autores**
```graphql
query GetAuthors {
    get_authors {
        name
    }
}
```

#### 5️⃣ **Query Combinada Épica** (múltiplos dados em uma request!)
```graphql
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
```

## 📊 Visualizações de Dados

### 1. **Publishers Distribution** (Gráfico de Pizza)
- Top 10 publishers
- Visualização interativa com cores dinâmicas

### 2. **Top Authors** (Gráfico de Barras Horizontal)
- 10 autores mais prolíficos
- Contagem de livros por autor

### 3. **Publication Timeline** (Gráfico de Linha)
- Análise temporal de publicações
- Linha suavizada com área preenchida

### 4. **Data Completeness Radar**
- Estatísticas de qualidade dos dados
- Visualização radar de múltiplas métricas

## 🎨 Tecnologias Utilizadas

### Frontend
- 🎯 **Vanilla JavaScript** (ES6+)
- 📊 **Chart.js 4.4.1** - Gráficos interativos
- 🌟 **Particles.js 2.0.0** - Efeitos de fundo épicos
- ✨ **Anime.js 3.2.1** - Animações suaves
- 🎨 **CSS3 Avançado** - Gradientes, glassmorphism, animações

### Backend (Elixir)
- ⚡ **Absinthe** - GraphQL para Elixir
- 🔌 **Plug** - Middleware HTTP
- 🐄 **Cowboy** - Servidor HTTP
- 📡 **gRPC** - Comunicação com serviços

## 🚀 Como Usar

### Pré-requisitos

1. **Servidor Elixir rodando** na porta 4000:
```bash
cd bi_service/bi_service
mix deps.get
iex -S mix
```

2. **Servidor deve estar acessível** em `http://localhost:4000/graphql`

### Executar o Website

#### Opção 1: Servidor HTTP simples (Python)
```bash
cd website_lindo
python3 -m http.server 8080
```

#### Opção 2: Node.js http-server
```bash
cd website_lindo
npx http-server -p 8080
```

#### Opção 3: Abrir diretamente no navegador
Simplesmente abra o arquivo `index.html` no seu navegador (pode ter limitações CORS)

### Acessar

Abra seu navegador em: `http://localhost:8080`

## 🎮 Como Usar o Website

1. **🔍 Buscar por Nome**
   - Digite o título do livro
   - Clique em "Search Books" ou pressione Enter
   - Veja os resultados filtrados + gráficos atualizados

2. **👤 Buscar por Autor**
   - Digite o nome do autor
   - Clique em "Find by Author" ou pressione Enter
   - Veja todos os livros do autor

3. **📚 Carregar Todos os Livros**
   - Clique em "Load All Books"
   - Visualize toda a coleção

4. **📖 Listar Autores**
   - Clique em "Get All Authors"
   - Veja uma lista completa em popup

5. **📊 Explorar Gráficos**
   - Interaja com os gráficos
   - Hover para ver detalhes
   - Clique em legendas para filtrar

6. **📖 Ver Detalhes de Livros**
   - Clique em qualquer card de livro
   - Veja descrição completa e ISBNs

## 🔧 Configuração da URL Base

Para mudar o endpoint GraphQL, edite a variável em [app.js](app.js):

```javascript
const GRAPHQL_CONFIG = {
    BASE_URL: 'http://SEU-SERVIDOR:PORTA/graphql',  // ⚡ MUDE AQUI!
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};
```

Esta variável é usada em **TODAS** as requests GraphQL através da classe `EpicGraphQLClient`.

## 📁 Estrutura do Projeto

```
website_lindo/
├── index.html          # Interface principal com layout épico
├── app.js              # Cliente GraphQL + lógica + gráficos
└── README.md           # Esta documentação épica
```

## 🎨 Features Visuais

- ✨ **Efeito Particles.js** no background
- 🌊 **Animações Anime.js** nos elementos
- 💎 **Glassmorphism** nos cards
- 🌈 **Gradientes dinâmicos** e cores neon
- ⚡ **Glow effects** nos títulos
- 🎯 **Hover effects** interativos
- 📱 **Design responsivo** para mobile

## 🔒 Schema GraphQL do Elixir

O website consome o seguinte schema (definido em `bi_service/lib/bi_service/logic.ex`):

```elixir
object :book do
  field(:title, :string)
  field(:authors, :string)
  field(:publisher, :string)
  field(:isbn_10, :string)
  field(:isbn_13, :string)
  field(:description, :string)
  field(:small_thumbnail, :string)
  field(:thumbnail, :string)
end

object :author do
  field(:name, :string)
end

query do
  field :books, list_of(:book)
  field :search_by_name, list_of(:book) do
    arg(:name, non_null(:string))
  end
  field :search_by_author, list_of(:book) do
    arg(:author, non_null(:string))
  end
  field :get_authors, list_of(:author)
end
```

## 🐛 Troubleshooting

### Erro: "Failed to fetch"
- ✅ Verifique se o servidor Elixir está rodando
- ✅ Confirme que está acessível em `localhost:4000`
- ✅ Verifique configurações de CORS no servidor

### Gráficos não aparecem
- ✅ Verifique o console do navegador (F12)
- ✅ Confirme que Chart.js foi carregado
- ✅ Certifique-se que há dados retornados

### Particles não funcionam
- ✅ Verifique conexão com internet (CDN)
- ✅ Veja erros no console do navegador

## 🎯 Demonstração do Poder do GraphQL

Este website demonstra as principais vantagens do GraphQL:

1. ✅ **Queries flexíveis** - Solicite apenas os campos necessários
2. ✅ **Filtros poderosos** - Busque por nome, autor, etc.
3. ✅ **Uma única endpoint** - Todas as queries em `/graphql`
4. ✅ **Type safety** - Schema fortemente tipado
5. ✅ **Queries combinadas** - Múltiplos recursos em uma request
6. ✅ **Documentação automática** - Schema autodocumentado
7. ✅ **Performance** - Busque exatamente o que precisa

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Adicionar mutations (criar, editar, deletar)
- [ ] Implementar paginação infinita
- [ ] Adicionar subscriptions (dados em tempo real)
- [ ] Cache de queries com localStorage
- [ ] Modo escuro/claro
- [ ] Export de dados (CSV, JSON)
- [ ] Filtros combinados avançados
- [ ] GraphiQL integrado no website

## 📝 Licença

Projeto educacional - Use à vontade! 🎓

## 🙌 Créditos

- **Backend**: Elixir + Absinthe GraphQL
- **Charts**: Chart.js
- **Animations**: Anime.js
- **Particles**: Particles.js
- **Design**: Custom CSS épico

---

**🔥 Desenvolvido para demonstrar o PODER TOTAL do GraphQL com Elixir! 🔥**
