# Simulador de Custos

Sistema 100% estático para calcular custos de produtos, veículos e eventos. Funciona **sem servidor, sem banco, sem internet**.

## Arquivos

```
index.html        →  Estrutura HTML
style.css         →  Estilos (5.7 KB)
script.js         →  Lógica completa (27 KB)
manifest.json     →  PWA manifest
sw.js             →  Service Worker (offline)
404.html          →  Fallback GitHub Pages
.nojekyll         →  GitHub Pages flag
assets/icons/     →  Ícones do app
```

## Como usar

1. **Testar local**: abra `index.html` no navegador
2. **Publicar no GitHub Pages**:
   - Crie um repositório `simulador-custos`
   - Faça upload de TODOS os arquivos acima
   - Settings → Pages → Branch: main, pasta: / → Save
   - URL: `https://SEU-USUARIO.github.io/simulador-custos/`
3. **Instalar (PWA)**: abra no Chrome → ⋮ → Adicionar à tela inicial
4. **Gerar APK**: abra `gerar-apk.html` para instruções

## Funcionalidades

- 📦 **Produtos**: custo total, markup, preço de venda, margem
- 🚗 **Veículos**: carro/moto, depreciação por categoria, custo/km
- 🎪 **Eventos**: 16 categorias de custo, ROI, ponto de equilíbrio, gráfico comparativo
- 📊 **Dashboard**: resumo geral
- 🌙 **Modo escuro**
- 📤 **Exportar/Importar** backup JSON
- 📲 **PWA**: instalação na tela inicial, funciona offline

## Tecnologias

Zero dependências. HTML puro, CSS puro, JavaScript puro. Gráfico Canvas próprio (sem Chart.js).
