# Changelog

## [1.1.0] - 2026-06-12

### Adicionado
- Consulta integrada à tabela FIPE (API parallelum.com.br) no módulo Veículos
- Seletor cascateante de Marca → Modelo → Ano para consulta FIPE
- Auto-preenchimento do valor do veículo após consulta FIPE
- Persistência dos dados da consulta FIPE (marca, modelo, ano, valor, data, código)
- Tooltip explicativo sobre depreciação no formulário de veículos
- Seções organizadas no formulário: Identificação, Consulta FIPE, Valor e Custos, Quilometragem
- Resumo automático em tempo real do veículo (custo mensal, anual, por km)
- Validação de campos obrigatórios (nome, valor > 0, km >= 0)
- Indicador visual (tag "FIPE") nos veículos consultados na listagem
- Suporte a hidden fields para metadados da consulta FIPE

### Modificado
- Formulário de veículos reorganizado com seções e labels mais descritivas
- Texto de ajuda para campos de quilometragem e depreciação
- Estilos CSS para tooltips, seções, cards de resumo e indicadores FIPE

### Corrigido
- Parsing de valores monetários da FIPE com suporte a múltiplos separadores de milhar

## [1.0.0] - 2026-06-01

### Adicionado
- Versão inicial do sistema de gestão financeira
- Módulo de Produtos (cálculo de lucro, markup, comissão)
- Módulo de Veículos (depreciação, custos mensais, custo por km)
- Módulo de Eventos (custos, faturamento, ticket médio)
- Painel com resumo financeiro
- Salvamento automático no localStorage
- PWA com service worker e instalação offline
- Tema responsivo (claro/escuro)
