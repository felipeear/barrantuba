# Barrantuba — deploy na Vercel

## O que foi corrigido
- API Express original (`server.ts`) pode agora ser invocada como função serverless (`api/index.ts`).
- Rewrites direcionam `/api/*` à função sem alterar os caminhos utilizados pelo frontend.
- A inicialização pesada de imagens/catálogos em segundo plano é desativada em Vercel para evitar tarefas interrompidas. **Os dados-base e fotos que dependem desses seeds precisam ser preparados no banco separadamente.**
- Mantido `npm run dev` para desenvolvimento local e `npm run build` para gerar `dist`.

## Publicação
1. Substitua os arquivos do repositório no GitHub pelos arquivos deste ZIP; faça commit e push para a branch conectada ao projeto na Vercel. Evite enviar `.env` real e segredos.
2. Na Vercel, em **Settings → Environment Variables**, cadastre os valores reais de `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` do PostgreSQL que o aplicativo já utiliza. Adicione `GEMINI_API_KEY` somente se as funcionalidades que a utilizam forem necessárias. **Não use os valores de exemplo.**
3. Verifique se o banco PostgreSQL é acessível externamente a partir da Vercel e se o usuário tem permissões sobre as tabelas. O código original não define `ssl`; se o provedor exigir TLS, ajuste a configuração do pool conforme seu provedor.
4. Confirme o **Root Directory** como raiz do projeto e o framework como Vite. Publique um novo deploy.
5. Teste `https://SEU-DOMINIO.vercel.app/api/health` — deve retornar JSON com `ok: true` e `db: connected` (se estiver `warming`, cheque as credenciais/conectividade).
6. Teste `/api/users` e depois a edição de perfil. Se retornar 500, abra **Vercel → Logs** para verificar a mensagem real do banco.

## Alertas
- Este ZIP não inclui credenciais nem o banco de dados que estava no Google AI Studio. Publicar apenas o código **não migra os dados antigos**.
- Existem operações de inicialização de banco e de semeadura de catálogos/fotos no projeto original. Na Vercel, a semeadura longa em segundo plano não é confiável; execute essas rotinas em um processo controlado antes de depender de fotos/catálogos.
- **Segurança:** o backend original não aplica autorização robusta a todas as rotas de escrita. Antes de abrir o aplicativo ao público, é importante implementar autenticação/autorização em endpoints sensíveis. Esta adaptação resolve a estrutura do deploy, não uma auditoria de segurança.
- A API permite JSON de até 50 MB, mas uploads em funções Vercel podem exceder limites do provedor. Para imagens grandes, use upload direto em armazenamento de objetos.
