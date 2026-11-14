import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './src/db/index.ts';
import {
  dbGetSpots,
  dbSaveSpot,
  dbDeleteSpot,
  dbGetCatches,
  dbSaveCatch,
  dbDeleteCatch,
  dbGetUsers,
  dbSaveUser,
  dbDeleteUser,
  dbToggleFollow,
  dbGetSessions,
  dbSaveSession,
  dbDeleteSession,
  dbGetMessages,
  dbSaveMessage,
  dbDeleteMessage,
  dbGetTournaments,
  dbSaveTournament,
  dbDeleteTournament,
  dbGetNotifications,
  dbSaveNotification,
  dbMarkNotificationRead,
  dbGetFeedPosts,
  dbSaveFeedPost,
  dbDeleteFeedPost,
  dbToggleLikeFeedPost,
  dbAddCommentFeedPost,
  dbShareFeedPost,
  dbGetStories,
  dbSaveStory,
  dbDeleteStory,
  dbGetSetting,
  dbSetSetting,
  ensureDatabaseTablesExist,
  ensureAdminUserExists,
  ensureSpeciesPhotosSeeded,
  dbGetSpeciesPhotos,
  dbGetSpeciesPhotoBinary,
  dbSaveSpeciesPhoto,
  dbRevertSpeciesPhoto,
  ensureTackleCatalogSeeded,
  dbGetTackleCatalog,
  dbGetSavedTackleKits,
  dbSaveTackleKit,
  dbDeleteTackleKit,
} from './src/db/queries.ts';
import { resolveCitySpeciesOnline, prewarmPopularCities } from './src/db/citySpeciesResolver.ts';
import {
  ensureBaitPhotosSeeded,
  dbGetBaitPhotoBinary,
  dbGetBaitPhotos,
  dbSaveBaitPhoto,
  dbRevertBaitPhoto,
  resolveSpeciesBaitsOnline,
  resolveExactBaitPhotoOnline,
  resolveExactBaitPhotosBatch,
} from './src/db/baitResolver.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON payload parser with generous limit to support mobile photo uploads from gallery
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Immediate health endpoint for production readiness probes with fast 2s DB ping
  app.get('/api/health', async (_req, res) => {
    let dbStatus: 'connected' | 'warming' = 'warming';
    try {
      await Promise.race([
        pool.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      dbStatus = 'connected';
    } catch {
      dbStatus = 'warming';
    }
    res.status(200).json({ ok: true, db: dbStatus });
  });

  // Track table creation (fast DDL) separately from background PNG seeding so API requests never stall
  let dbTablesReady = false;
  let dbTablesPromise: Promise<void> | null = null;
  let bgSeedingStarted = false;

  const ensureTablesReady = (): Promise<void> => {
    if (dbTablesReady) return Promise.resolve();
    if (!dbTablesPromise) {
      dbTablesPromise = (async () => {
        await ensureDatabaseTablesExist();
        await ensureAdminUserExists();
        dbTablesReady = true;
      })()
        .catch((err) => {
          console.error('Database table bootstrap warning:', err);
          dbTablesPromise = null;
        });
    }
    return dbTablesPromise;
  };

  const triggerBackgroundSeeding = () => {
    if (bgSeedingStarted) return;
    bgSeedingStarted = true;
    void (async () => {
      try {
        await ensureTablesReady();
        await ensureTackleCatalogSeeded();
        await ensureSpeciesPhotosSeeded();
        await ensureBaitPhotosSeeded();
        await prewarmPopularCities();
      } catch (err) {
        console.error('Background PNG seeding warning:', err);
      }
    })();
  };

  // Start fast table creation immediately on boot; heavy PNG seeding begins once tables exist
  void ensureTablesReady().then(() => {
    triggerBackgroundSeeding();
  });

  // Ensure API handlers wait briefly only for fast table creation (never blocking on image seeding)
  app.use('/api', async (req, _res, next) => {
    if (req.path === '/health') return next();
    if (!dbTablesReady) {
      await Promise.race([
        ensureTablesReady(),
        new Promise<void>(resolve => setTimeout(resolve, 4000)),
      ]);
    }
    next();
  });

  // API Endpoints for PostgreSQL Persistence

  // 1. Fishing Spots
  app.get('/api/spots', async (req, res) => {
    try {
      const spots = await dbGetSpots();
      res.json(spots);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar pontos do banco' });
    }
  });

  app.post('/api/spots', async (req, res) => {
    try {
      const saved = await dbSaveSpot(req.body);
      const lat = Number(req.body?.latitude);
      const lon = Number(req.body?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        void resolveCitySpeciesOnline({
          cityName: String(req.body?.name || 'Ponto de Pesca'),
          latitude: lat,
          longitude: lon,
          forceRefresh: false,
        }).catch(() => {});
      }
      res.json(saved[0] || saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao salvar ponto no banco' });
    }
  });

  app.delete('/api/spots/:id', async (req, res) => {
    try {
      await dbDeleteSpot(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao excluir ponto do banco' });
    }
  });

  // 2. Fish Catches
  app.get('/api/catches', async (req, res) => {
    try {
      const catches = await dbGetCatches();
      res.json(catches);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar capturas do banco' });
    }
  });

  app.post('/api/catches', async (req, res) => {
    try {
      const saved = await dbSaveCatch(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      console.error('POST /api/catches error:', error);
      res.status(500).json({ error: error.message || 'Erro ao registrar captura no banco' });
    }
  });

  app.delete('/api/catches/:id', async (req, res) => {
    try {
      await dbDeleteCatch(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao excluir captura do banco' });
    }
  });

  // 3. Users, Profiles & Follow/Unfollow
  app.get('/api/users', async (req, res) => {
    try {
      const users = await dbGetUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar membros do banco' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const saved = await dbSaveUser(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      console.error('POST /api/users error:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar membro no banco' });
    }
  });

  app.post('/api/users/follow', async (req, res) => {
    try {
      const { followerId, targetUserId } = req.body;
      const result = await dbToggleFollow(followerId, targetUserId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao atualizar seguidor no banco' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      await dbDeleteUser(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao remover membro do banco' });
    }
  });

  // 4. Active Sessions (Em Tempo Real)
  app.get('/api/sessions', async (req, res) => {
    try {
      const sessions = await dbGetSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar pescarias ativas' });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const saved = await dbSaveSession(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao salvar pescaria ativa' });
    }
  });

  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      await dbDeleteSession(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao encerrar pescaria' });
    }
  });

  // 5. Chat Messages
  app.get('/api/messages', async (req, res) => {
    try {
      const messages = await dbGetMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar mensagens do chat' });
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const saved = await dbSaveMessage(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao enviar mensagem' });
    }
  });

  app.delete('/api/messages/:id', async (req, res) => {
    try {
      await dbDeleteMessage(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao excluir mensagem' });
    }
  });

  // 6. Tournaments
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await dbGetTournaments();
      res.json(tournaments);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar torneios' });
    }
  });

  app.post('/api/tournaments', async (req, res) => {
    try {
      const saved = await dbSaveTournament(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao salvar torneio' });
    }
  });

  app.delete('/api/tournaments/:id', async (req, res) => {
    try {
      await dbDeleteTournament(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao excluir torneio' });
    }
  });

  // 7. Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const notifications = await dbGetNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao carregar notificações' });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const saved = await dbSaveNotification(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao salvar notificação' });
    }
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      await dbMarkNotificationRead(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao marcar notificação como lida' });
    }
  });

  // 8. Feed Posts (Atomic PostgreSQL persistence in feed_posts table)
  app.get('/api/feed-posts', async (req, res) => {
    try {
      const posts = await dbGetFeedPosts();
      res.json(posts);
    } catch (error: any) {
      console.error('GET /api/feed-posts error:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar publicações do feed' });
    }
  });

  app.post('/api/feed-posts', async (req, res) => {
    try {
      const post = await dbSaveFeedPost(req.body);
      res.json({ post });
    } catch (error: any) {
      console.error('POST /api/feed-posts error:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar publicação no feed' });
    }
  });

  app.post('/api/feed-posts/:id/like', async (req, res) => {
    try {
      const post = await dbToggleLikeFeedPost(req.params.id, req.body.userId);
      if (!post) {
        return res.status(404).json({ error: 'Publicação não encontrada no banco.' });
      }
      res.json({ post });
    } catch (error: any) {
      console.error('POST /api/feed-posts/:id/like error:', error);
      res.status(500).json({ error: error.message || 'Erro ao curtir publicação' });
    }
  });

  app.post('/api/feed-posts/:id/comment', async (req, res) => {
    try {
      const post = await dbAddCommentFeedPost(req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ error: 'Publicação não encontrada no banco.' });
      }
      res.json({ post });
    } catch (error: any) {
      console.error('POST /api/feed-posts/:id/comment error:', error);
      res.status(500).json({ error: error.message || 'Erro ao comentar publicação' });
    }
  });

  app.post('/api/feed-posts/:id/share', async (req, res) => {
    try {
      const post = await dbShareFeedPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Publicação não encontrada no banco.' });
      }
      res.json({ post });
    } catch (error: any) {
      console.error('POST /api/feed-posts/:id/share error:', error);
      res.status(500).json({ error: error.message || 'Erro ao compartilhar publicação' });
    }
  });

  app.delete('/api/feed-posts/:id', async (req, res) => {
    try {
      const result = await dbDeleteFeedPost(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error('DELETE /api/feed-posts/:id error:', error);
      res.status(500).json({ error: error.message || 'Erro ao excluir publicação' });
    }
  });

  // 9. Stories (24h Atomic PostgreSQL persistence in feed_stories table)
  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await dbGetStories();
      res.json(stories);
    } catch (error: any) {
      console.error('GET /api/stories error:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar stories' });
    }
  });

  app.post('/api/stories', async (req, res) => {
    try {
      const story = await dbSaveStory(req.body);
      res.json({ story });
    } catch (error: any) {
      console.error('POST /api/stories error:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar story' });
    }
  });

  app.delete('/api/stories/:id', async (req, res) => {
    try {
      const result = await dbDeleteStory(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error('DELETE /api/stories/:id error:', error);
      res.status(500).json({ error: error.message || 'Erro ao excluir story' });
    }
  });

  // 10. Settings (Logo & Configurations)
  app.get('/api/settings/:key', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const value = await dbGetSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao ler configuração' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { key, value } = req.body;
      const saved = await dbSetSetting(key, value);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json(saved[0] || saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao salvar configuração' });
    }
  });

  // 11. BiteTime™ Real Fish Species Photos (PostgreSQL species_photos table)
  app.get('/api/species-photos', async (req, res) => {
    try {
      const photos = await dbGetSpeciesPhotos();
      res.json(photos);
    } catch (error: any) {
      console.error('GET /api/species-photos error:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar fotos das espécies do banco' });
    }
  });

  app.get('/api/species-photos/:id/image', async (req, res) => {
    try {
      const result = await dbGetSpeciesPhotoBinary(req.params.id);
      if (!result) {
        return res.status(404).end();
      }
      if ('redirectUrl' in result) {
        return res.redirect(result.redirectUrl);
      }
      const etag = `"${result.updatedAt || '1'}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      res.setHeader('Content-Type', result.contentType);
      res.send(result.buffer);
    } catch (error: any) {
      console.error('GET /api/species-photos/:id/image error:', error);
      res.status(500).end();
    }
  });

  app.post('/api/species-photos', async (req, res) => {
    try {
      const { speciesId, speciesName, imageData } = req.body;
      const photo = await dbSaveSpeciesPhoto(speciesId, speciesName, imageData);
      res.json({ photo });
    } catch (error: any) {
      console.error('POST /api/species-photos error:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar foto da espécie no banco' });
    }
  });

  app.post('/api/species-photos/:id/revert', async (req, res) => {
    try {
      const photo = await dbRevertSpeciesPhoto(req.params.id);
      res.json({ photo });
    } catch (error: any) {
      console.error('POST /api/species-photos/:id/revert error:', error);
      res.status(500).json({ error: error.message || 'Erro ao restaurar foto da espécie no banco' });
    }
  });

  // 12. Online City Real Fish Species Identification (iNaturalist + Open-Meteo Marine + PostgreSQL)
  app.get('/api/city-species', async (req, res) => {
    try {
      const cityName = String(req.query.name || 'Laguna').trim();
      const latitude = Number(req.query.lat);
      const longitude = Number(req.query.lon);
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ error: 'Latitude e longitude válidas são obrigatórias.' });
      }

      const result = await resolveCitySpeciesOnline({
        cityName,
        latitude,
        longitude,
        forceRefresh,
      });
      res.json(result);
    } catch (error: any) {
      console.error('GET /api/city-species error:', error);
      res.status(500).json({ error: error.message || 'Erro ao identificar peixes reais da cidade on-line.' });
    }
  });

  // 13. Bait / Lure Photos (PostgreSQL bait_photos table served as fast binary JPEG + Admin CRUD)
  app.get('/api/bait-photos', async (_req, res) => {
    try {
      const photos = await dbGetBaitPhotos();
      res.json(photos);
    } catch (error: any) {
      console.error('GET /api/bait-photos error:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar fotos das iscas do banco' });
    }
  });

  app.post('/api/bait-photos', async (req, res) => {
    try {
      const { baitId, baitName, category, imageData } = req.body;
      const photo = await dbSaveBaitPhoto({ baitId, baitName, category, imageData });
      res.json({ photo });
    } catch (error: any) {
      console.error('POST /api/bait-photos error:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar foto da isca no banco' });
    }
  });

  app.post('/api/bait-photos/:id/revert', async (req, res) => {
    try {
      const baitNameHint = String(req.body?.baitName || req.query.name || '').trim() || undefined;
      const photo = await dbRevertBaitPhoto(req.params.id, baitNameHint);
      res.json({ photo });
    } catch (error: any) {
      console.error('POST /api/bait-photos/:id/revert error:', error);
      res.status(500).json({ error: error.message || 'Erro ao restaurar foto original da isca' });
    }
  });

  app.get('/api/bait-photos/:id/image', async (req, res) => {
    try {
      const baitNameHint = String(req.query.name || '').trim() || undefined;
      const result = await dbGetBaitPhotoBinary(req.params.id, baitNameHint);
      if (!result) {
        return res.status(404).end();
      }
      const etag = `"${result.updatedAt || '1'}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      res.setHeader('Content-Type', result.contentType);
      res.send(result.buffer);
    } catch (error: any) {
      console.error('GET /api/bait-photos/:id/image error:', error);
      res.status(500).end();
    }
  });

  app.get('/api/bait-photo-by-name', async (req, res) => {
    try {
      const baitName = String(req.query.name || '').trim();
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
      if (!baitName) {
        return res.status(400).json({ error: 'Nome da isca é obrigatório.' });
      }
      const resolved = await resolveExactBaitPhotoOnline(baitName, forceRefresh);
      res.json(resolved);
    } catch (error: any) {
      console.error('GET /api/bait-photo-by-name error:', error);
      res.status(500).json({ error: error.message || 'Erro ao buscar foto real on-line da isca.' });
    }
  });

  app.post('/api/bait-photos/prefetch', async (req, res) => {
    try {
      const names = Array.isArray(req.body?.names) ? req.body.names.map((n: any) => String(n)) : [];
      const items = await resolveExactBaitPhotosBatch(names);
      res.json({ items });
    } catch (error: any) {
      console.error('POST /api/bait-photos/prefetch error:', error);
      res.status(500).json({ error: error.message || 'Erro ao pré-carregar fotos das iscas.' });
    }
  });

  // 14. Online Researched Baits per Selected Fish Species (Wikipedia + iNaturalist + PostgreSQL)
  app.get('/api/species-baits', async (req, res) => {
    try {
      const speciesId = String(req.query.speciesId || '').trim();
      const speciesName = String(req.query.speciesName || '').trim();
      const scientificName = String(req.query.scientificName || '').trim();
      const environmentRaw = String(req.query.environment || 'rio').trim();
      const environment =
        environmentRaw === 'mar' || environmentRaw === 'estuario' ? environmentRaw : 'rio';
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

      if (!speciesId || !speciesName) {
        return res.status(400).json({ error: 'speciesId e speciesName são obrigatórios.' });
      }

      const guide = await resolveSpeciesBaitsOnline({
        speciesId,
        speciesName,
        scientificName,
        environment,
        forceRefresh,
      });
      res.json(guide);
    } catch (error: any) {
      console.error('GET /api/species-baits error:', error);
      res.status(500).json({ error: error.message || 'Erro ao pesquisar iscas reais da espécie.' });
    }
  });

  // 15. Tackle Equipment Recommendation System (5 Catalog Tables + Saved User Kits in PostgreSQL)
  app.get('/api/tackle/catalog', async (_req, res) => {
    try {
      const catalog = await dbGetTackleCatalog();
      res.json(catalog);
    } catch (error: any) {
      console.error('GET /api/tackle/catalog error:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar catálogo de equipamentos.' });
    }
  });

  app.get('/api/tackle/kits', async (req, res) => {
    try {
      const userId = String(req.query.userId || '').trim() || undefined;
      const kits = await dbGetSavedTackleKits(userId);
      res.json(kits);
    } catch (error: any) {
      console.error('GET /api/tackle/kits error:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar kits salvos.' });
    }
  });

  app.post('/api/tackle/kits', async (req, res) => {
    try {
      const saved = await dbSaveTackleKit(req.body);
      res.json(saved[0] || saved);
    } catch (error: any) {
      console.error('POST /api/tackle/kits error:', error);
      res.status(500).json({ error: error.message || 'Erro ao salvar kit recomendado.' });
    }
  });

  app.delete('/api/tackle/kits/:id', async (req, res) => {
    try {
      await dbDeleteTackleKit(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      console.error('DELETE /api/tackle/kits/:id error:', error);
      res.status(500).json({ error: error.message || 'Erro ao excluir kit salvo.' });
    }
  });

  // Serve static local asset fallbacks even in production builds
  app.use('/src/assets', express.static(path.resolve(__dirname, 'src', 'assets')));
  app.use('/public/assets', express.static(path.resolve(__dirname, 'public', 'assets')));
  app.use('/assets', express.static(path.resolve(__dirname, 'public', 'assets')));
  app.use(express.static(path.resolve(__dirname, 'public')));

  // Dev server with Vite middleware vs Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Barrantuba Clube de Pesca server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting Barrantuba server:', err);
});
