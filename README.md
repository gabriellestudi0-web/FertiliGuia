# FertiliGuia — sistema

Sistema web PWA para recomendação acadêmica de adubação baseada no Boletim 100 do IAC.

## Como testar

1. Extraia o ZIP.
2. Abra a pasta no VS Code.
3. Rode um servidor local. Exemplo:

```bash
python -m http.server 8000
```

4. Acesse:

```txt
http://localhost:8000
```

## O que já está implementado

- PWA instalável
- Funcionamento offline após o primeiro carregamento
- Histórico local com localStorage
- PDF técnico com jsPDF
- Dashboard visual
- IA explicativa local, sem tomada de decisão agronômica
- Login Google preparado via Firebase Auth
- Milho e soja ativos no sistema
- Cana, café e laranja deixados como estrutura futura

## Importante

O login Google só funciona depois de preencher `js/auth.js` com as credenciais do Firebase e autorizar o domínio no Firebase Console.

O sistema é um sistema. Não substitui recomendação de engenheiro agrônomo.
