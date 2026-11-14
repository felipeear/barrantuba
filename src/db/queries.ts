import fs from 'fs';
import path from 'path';
import { eq, inArray, sql } from 'drizzle-orm';
import { db, withDbRetry } from './index.ts';
import { 
  usersTable, 
  spotsTable, 
  catchesTable, 
  activeSessionsTable, 
  chatMessagesTable, 
  tournamentsTable, 
  notificationsTable, 
  clubSettingsTable,
  feedPostsTable,
  storiesTable,
  speciesPhotosTable,
  tackleSpeciesTable,
  tackleRodsTable,
  tackleReelsTable,
  tackleLinesTable,
  tackleBaitsTable,
  tackleSavedKitsTable
} from './schema.ts';
import { DEFAULT_TACKLE_CATALOG, type TackleCatalog } from '../services/tackleRecommendationEngine.ts';

const BOT_USER_IDS = new Set(['user_pescaparana', 'user_aventura_sc', 'user_eventos']);
const BOT_POST_IDS = new Set(['post_corrida_cdl', 'post_pesca_corvina', 'post_aventura_sc']);
const BOT_STORY_IDS = new Set(['story_felipeear', 'story_eventos', 'story_aventura', 'story_pesca']);

function mapUserRow(r: any) {
  const eqData = (r.equipment as any) || {};
  const rawFollowers: string[] = Array.isArray(eqData.followers) ? eqData.followers : [];
  const rawFollowing: string[] = Array.isArray(eqData.following) ? eqData.following : [];
  const followers = rawFollowers.filter(id => !BOT_USER_IDS.has(id));
  const following = rawFollowing.filter(id => !BOT_USER_IDS.has(id));

  return {
    ...r,
    handle: eqData.handle || `@${(r.name || 'pescador').toLowerCase().replace(/\s+/g, '_')}`,
    subtitle: eqData.subtitle !== undefined ? eqData.subtitle : 'Pescador esportivo 🎣',
    isVerified: eqData.isVerified ?? true,
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    savedCatchIds: Array.isArray(eqData.savedCatchIds) ? eqData.savedCatchIds : [],
    savedPostIds: Array.isArray(eqData.savedPostIds) ? eqData.savedPostIds : [],
    customEquipment: Array.isArray(eqData.customEquipment) ? eqData.customEquipment : [],
    isPrivate: Boolean(eqData.isPrivate),
    equipment: {
      rods: eqData.rods || '',
      reels: eqData.reels || '',
      lines: eqData.lines || '',
      boatOrKayak: eqData.boatOrKayak || '',
      favoriteLures: eqData.favoriteLures || ''
    }
  };
}

// User queries
export async function dbGetUsers() {
  try {
    const rows = await withDbRetry(() => db.select().from(usersTable), 'dbGetUsers');
    return rows
      .filter(r => !BOT_USER_IDS.has(r.id))
      .map(mapUserRow);
  } catch (error) {
    console.error('dbGetUsers error:', error);
    throw new Error('Falha ao consultar pescadores no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveUser(userData: any) {
  try {
    return await withDbRetry(async () => {
      // Preserve existing fields (followers/following/savedPostIds) and avoid email unique conflict
      let existingRows = await db.select().from(usersTable).where(eq(usersTable.id, userData.id));
      if (existingRows.length === 0 && userData.email) {
        existingRows = await db
          .select()
          .from(usersTable)
          .where(sql`lower(${usersTable.email}) = lower(${String(userData.email).trim()})`);
      }

      const existingRow = existingRows[0];
      const targetId = existingRow?.id || userData.id;
      const existingEq = (existingRow?.equipment as any) || {};

      const rawFollowers: string[] = Array.isArray(userData.followers)
        ? userData.followers
        : (Array.isArray(existingEq.followers) ? existingEq.followers : []);
      const rawFollowing: string[] = Array.isArray(userData.following)
        ? userData.following
        : (Array.isArray(existingEq.following) ? existingEq.following : []);

      const cleanFollowers = rawFollowers.filter(id => !BOT_USER_IDS.has(id));
      const cleanFollowing = rawFollowing.filter(id => !BOT_USER_IDS.has(id));

      const resolvedName = (typeof userData.name === 'string' && userData.name.trim())
        ? userData.name.trim()
        : (existingRow?.name || 'Pescador');
      const resolvedHandle = (typeof userData.handle === 'string' && userData.handle.trim())
        ? (userData.handle.trim().startsWith('@') ? userData.handle.trim() : `@${userData.handle.trim()}`)
        : (existingEq.handle || `@${resolvedName.toLowerCase().replace(/\s+/g, '_')}`);
      const resolvedSubtitle = userData.subtitle !== undefined
        ? String(userData.subtitle)
        : (existingEq.subtitle !== undefined ? existingEq.subtitle : 'Pescador esportivo 🎣');
      const resolvedAvatar = (typeof userData.avatar === 'string' && userData.avatar.trim())
        ? userData.avatar.trim()
        : (existingRow?.avatar ?? null);
      const resolvedPhone = userData.phone !== undefined ? userData.phone : (existingRow?.phone ?? null);
      const resolvedCity = userData.city !== undefined ? userData.city : (existingRow?.city ?? null);
      const resolvedBio = userData.bio !== undefined ? userData.bio : (existingRow?.bio ?? null);

      const equipmentPayload = {
        ...(typeof existingEq === 'object' ? existingEq : {}),
        ...(typeof userData.equipment === 'object' ? userData.equipment : {}),
        customEquipment: userData.customEquipment ?? existingEq.customEquipment ?? [],
        handle: resolvedHandle,
        subtitle: resolvedSubtitle,
        followers: cleanFollowers,
        following: cleanFollowing,
        followersCount: cleanFollowers.length,
        followingCount: cleanFollowing.length,
        savedCatchIds: userData.savedCatchIds ?? existingEq.savedCatchIds ?? [],
        savedPostIds: userData.savedPostIds ?? existingEq.savedPostIds ?? [],
        isVerified: userData.isVerified ?? existingEq.isVerified ?? true,
        isPrivate: userData.isPrivate ?? existingEq.isPrivate ?? false
      };

      const normalizedEmail = String(userData.email || existingRow?.email || '').trim().toLowerCase();

      const saved = await db
        .insert(usersTable)
        .values({
          id: targetId,
          name: resolvedName,
          email: normalizedEmail,
          role: userData.role || existingRow?.role || 'member',
          avatar: resolvedAvatar,
          phone: resolvedPhone,
          city: resolvedCity,
          passwordHash: userData.passwordHash || existingRow?.passwordHash || null,
          equipment: equipmentPayload,
          preferredSpecies: userData.preferredSpecies || existingRow?.preferredSpecies || [],
          joinedDate: userData.joinedDate || existingRow?.joinedDate || new Date().toISOString().split('T')[0],
          bio: resolvedBio,
        })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: {
            name: resolvedName,
            email: normalizedEmail,
            role: userData.role || existingRow?.role || 'member',
            avatar: resolvedAvatar,
            phone: resolvedPhone,
            city: resolvedCity,
            ...(userData.passwordHash ? { passwordHash: userData.passwordHash } : {}),
            equipment: equipmentPayload,
            preferredSpecies: userData.preferredSpecies || existingRow?.preferredSpecies || [],
            bio: resolvedBio,
          },
        })
        .returning();

      // Keep author profile photo, display name & handle in sync across authored records
      await Promise.all([
        db.update(feedPostsTable)
          .set({ userName: resolvedName, userAvatar: resolvedAvatar, userHandle: resolvedHandle })
          .where(eq(feedPostsTable.userId, targetId)),
        db.update(storiesTable)
          .set({ userName: resolvedName, userAvatar: resolvedAvatar, userHandle: resolvedHandle })
          .where(eq(storiesTable.userId, targetId)),
        db.update(catchesTable)
          .set({ userName: resolvedName, userAvatar: resolvedAvatar })
          .where(eq(catchesTable.userId, targetId)),
        db.update(activeSessionsTable)
          .set({ userName: resolvedName, userAvatar: resolvedAvatar })
          .where(eq(activeSessionsTable.userId, targetId)),
        db.update(chatMessagesTable)
          .set({ userName: resolvedName, userAvatar: resolvedAvatar })
          .where(eq(chatMessagesTable.userId, targetId)),
      ]);

      return saved.map(mapUserRow);
    }, 'dbSaveUser');
  } catch (error) {
    console.error('dbSaveUser error:', error);
    throw new Error('Falha ao salvar membro no PostgreSQL.', { cause: error });
  }
}

export async function dbDeleteUser(userId: string) {
  try {
    return await withDbRetry(
      () => db.delete(usersTable).where(eq(usersTable.id, userId)).returning(),
      'dbDeleteUser'
    );
  } catch (error) {
    console.error('dbDeleteUser error:', error);
    throw new Error('Falha ao remover membro.', { cause: error });
  }
}

export async function dbToggleFollow(followerId: string, targetUserId: string) {
  try {
    if (!followerId || !targetUserId || followerId === targetUserId) {
      throw new Error('IDs inválidos para seguir.');
    }

    return await withDbRetry(async () => {
      const [followerRows, targetRows] = await Promise.all([
        db.select().from(usersTable).where(eq(usersTable.id, followerId)),
        db.select().from(usersTable).where(eq(usersTable.id, targetUserId)),
      ]);

      if (followerRows.length === 0 || targetRows.length === 0) {
        throw new Error('Usuário não encontrado no banco de dados.');
      }

      const followerRow = followerRows[0];
      const targetRow = targetRows[0];
      const followerEq = (followerRow.equipment as any) || {};
      const targetEq = (targetRow.equipment as any) || {};

      const currentFollowing: string[] = (Array.isArray(followerEq.following) ? followerEq.following : []).filter(
        (id: string) => !BOT_USER_IDS.has(id)
      );
      const currentTargetFollowers: string[] = (Array.isArray(targetEq.followers) ? targetEq.followers : []).filter(
        (id: string) => !BOT_USER_IDS.has(id)
      );

      const isCurrentlyFollowing = currentFollowing.includes(targetUserId);

      const nextFollowing = isCurrentlyFollowing
        ? currentFollowing.filter(id => id !== targetUserId)
        : [...currentFollowing, targetUserId];

      const nextTargetFollowers = isCurrentlyFollowing
        ? currentTargetFollowers.filter(id => id !== followerId)
        : (currentTargetFollowers.includes(followerId) ? currentTargetFollowers : [...currentTargetFollowers, followerId]);

      const nextFollowerEq = {
        ...followerEq,
        following: nextFollowing,
        followingCount: nextFollowing.length
      };
      const nextTargetEq = {
        ...targetEq,
        followers: nextTargetFollowers,
        followersCount: nextTargetFollowers.length
      };

      const [updatedFollowerRows, updatedTargetRows] = await Promise.all([
        db.update(usersTable)
          .set({ equipment: nextFollowerEq })
          .where(eq(usersTable.id, followerId))
          .returning(),
        db.update(usersTable)
          .set({ equipment: nextTargetEq })
          .where(eq(usersTable.id, targetUserId))
          .returning(),
      ]);

      return {
        isFollowing: !isCurrentlyFollowing,
        follower: mapUserRow(updatedFollowerRows[0]),
        target: mapUserRow(updatedTargetRows[0]),
      };
    }, 'dbToggleFollow');
  } catch (error) {
    console.error('dbToggleFollow error:', error);
    throw new Error('Falha ao atualizar seguidor no PostgreSQL.', { cause: error });
  }
}

// Spots queries
export async function dbGetSpots() {
  try {
    return await withDbRetry(() => db.select().from(spotsTable), 'dbGetSpots');
  } catch (error) {
    console.error('dbGetSpots error:', error);
    throw new Error('Falha ao consultar pontos de pesca no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveSpot(spot: any) {
  try {
    return await withDbRetry(
      () =>
        db
          .insert(spotsTable)
          .values({
            id: spot.id,
            name: spot.name,
            description: spot.description || null,
            latitude: Number(spot.latitude),
            longitude: Number(spot.longitude),
            waterType: spot.waterType || 'Doce',
            accessType: spot.accessType || 'Livre',
            structureNotes: spot.structureNotes || null,
            recommendedBaits: spot.recommendedBaits || [],
            targetSpecies: spot.targetSpecies || spot.species || [],
            depthMeters: spot.depthMeters ? Number(spot.depthMeters) : null,
            rating: spot.rating ? Number(spot.rating) : 5.0,
            imageUrl: spot.imageUrl || null,
            createdByUserId: spot.createdByUserId || null,
            createdByUserName: spot.createdByUserName || null,
            createdAt: spot.createdAt || new Date().toISOString().split('T')[0],
          })
          .onConflictDoUpdate({
            target: spotsTable.id,
            set: {
              name: spot.name,
              description: spot.description || null,
              latitude: Number(spot.latitude),
              longitude: Number(spot.longitude),
              waterType: spot.waterType || 'Doce',
              accessType: spot.accessType || 'Livre',
              structureNotes: spot.structureNotes || null,
              recommendedBaits: spot.recommendedBaits || [],
              targetSpecies: spot.targetSpecies || spot.species || [],
              depthMeters: spot.depthMeters ? Number(spot.depthMeters) : null,
              rating: spot.rating ? Number(spot.rating) : 5.0,
              imageUrl: spot.imageUrl || null,
            },
          })
          .returning(),
      'dbSaveSpot'
    );
  } catch (error) {
    console.error('dbSaveSpot error:', error);
    throw new Error('Falha ao salvar ponto de pesca no PostgreSQL.', { cause: error });
  }
}

export async function dbDeleteSpot(spotId: string) {
  try {
    return await withDbRetry(
      () => db.delete(spotsTable).where(eq(spotsTable.id, spotId)).returning(),
      'dbDeleteSpot'
    );
  } catch (error) {
    console.error('dbDeleteSpot error:', error);
    throw new Error('Falha ao remover ponto de pesca.', { cause: error });
  }
}

// Catches queries
export async function dbGetCatches() {
  try {
    const rows = await withDbRetry(() => db.select().from(catchesTable), 'dbGetCatches');
    return rows.map(r => {
      let extra: any = {};
      let isJsonNotes = false;
      try {
        if (r.notes && (r.notes.startsWith('{') || r.notes.startsWith('['))) {
          extra = JSON.parse(r.notes);
          isJsonNotes = true;
        }
      } catch {}

      const likesList = Array.isArray(extra.likes) ? extra.likes : [];
      const commentsList = Array.isArray(extra.comments) ? extra.comments : [];
      const mediaList = Array.isArray(extra.mediaUrls) && extra.mediaUrls.length > 0 
        ? extra.mediaUrls 
        : (r.photoUrl ? [r.photoUrl] : []);

      const restoredReleased =
        typeof extra.released === 'boolean'
          ? extra.released
          : r.moonPhase
            ? r.moonPhase === 'Solto com vida'
            : true;
      const restoredTechnique = extra.technique || r.waterCondition || undefined;

      return {
        ...r,
        released: restoredReleased,
        technique: restoredTechnique,
        description: extra.description || (isJsonNotes ? '' : r.notes) || '',
        comments: commentsList,
        likes: likesList,
        mediaUrls: mediaList,
        videoUrl: extra.videoUrl || undefined,
        isLocationPrivate: Boolean(extra.isLocationPrivate),
        taggedUsers: extra.taggedUsers || [],
        notes: extra.userNotes || (isJsonNotes ? '' : r.notes) || '',
        likesCount: likesList.length > 0 ? likesList.length : (r.likesCount || 0)
      };
    });
  } catch (error) {
    console.error('dbGetCatches error:', error);
    throw new Error('Falha ao consultar capturas no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveCatch(item: any) {
  try {
    const isReleased = item.released === undefined ? true : Boolean(item.released);
    const techniqueStr = item.technique ? String(item.technique) : null;
    const socialPayload = JSON.stringify({
      description: item.description || '',
      comments: Array.isArray(item.comments) ? item.comments : [],
      likes: Array.isArray(item.likes) ? item.likes : [],
      mediaUrls: Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0 
        ? item.mediaUrls 
        : (item.photoUrl ? [item.photoUrl] : []),
      videoUrl: item.videoUrl || null,
      isLocationPrivate: Boolean(item.isLocationPrivate),
      taggedUsers: Array.isArray(item.taggedUsers) ? item.taggedUsers : [],
      userNotes: item.notes || '',
      released: isReleased,
      technique: techniqueStr,
    });

    const likesCount = Array.isArray(item.likes) && item.likes.length > 0 
      ? item.likes.length 
      : Number(item.likesCount || 0);

    const safeWeight = Number.isFinite(Number(item.weightKg)) ? Number(item.weightKg) : 1.0;
    const safeLength = Number.isFinite(Number(item.lengthCm)) ? Number(item.lengthCm) : 0;
    const safeSpotId = item.spotId || 'spot_private';
    const safeSpotName = item.spotName || 'Barrantuba';
    const safeBait = item.baitUsed || 'Isca Artificial';
    const safePhoto = item.photoUrl || '/src/assets/images/tucunare_trophy_fish_1793877702286.jpg';

    return await withDbRetry(
      () =>
        db
          .insert(catchesTable)
          .values({
            id: item.id,
            species: item.species || 'Peixe',
            weightKg: safeWeight,
            lengthCm: safeLength,
            baitUsed: safeBait,
            spotId: safeSpotId,
            spotName: safeSpotName,
            userId: item.userId,
            userName: item.userName || 'Pescador',
            userAvatar: item.userAvatar || null,
            photoUrl: safePhoto,
            capturedAt: item.capturedAt || new Date().toISOString(),
            notes: socialPayload,
            waterCondition: techniqueStr,
            moonPhase: isReleased ? 'Solto com vida' : 'Conservado',
            weatherTemp: item.weatherTemp ? String(item.weatherTemp) : null,
            likesCount: likesCount,
          })
          .onConflictDoUpdate({
            target: catchesTable.id,
            set: {
              species: item.species || 'Peixe',
              weightKg: safeWeight,
              lengthCm: safeLength,
              baitUsed: safeBait,
              spotId: safeSpotId,
              spotName: safeSpotName,
              photoUrl: safePhoto,
              notes: socialPayload,
              waterCondition: techniqueStr,
              moonPhase: isReleased ? 'Solto com vida' : 'Conservado',
              likesCount: likesCount,
            },
          })
          .returning(),
      'dbSaveCatch'
    );
  } catch (error) {
    console.error('dbSaveCatch error:', error);
    throw new Error('Falha ao salvar peixe capturado no PostgreSQL.', { cause: error });
  }
}

export async function dbDeleteCatch(catchId: string) {
  try {
    return await withDbRetry(
      () => db.delete(catchesTable).where(eq(catchesTable.id, catchId)).returning(),
      'dbDeleteCatch'
    );
  } catch (error) {
    console.error('dbDeleteCatch error:', error);
    throw new Error('Falha ao remover captura.', { cause: error });
  }
}

// Active Sessions
export async function dbGetSessions() {
  try {
    return await withDbRetry(() => db.select().from(activeSessionsTable), 'dbGetSessions');
  } catch (error) {
    console.error('dbGetSessions error:', error);
    throw new Error('Falha ao consultar pescarias ativas no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveSession(session: any) {
  try {
    return await withDbRetry(
      () =>
        db
          .insert(activeSessionsTable)
          .values({
            id: session.id,
            userId: session.userId,
            userName: session.userName,
            userAvatar: session.userAvatar || null,
            spotId: session.spotId,
            spotName: session.spotName,
            latitude: Number(session.latitude),
            longitude: Number(session.longitude),
            startedAt: session.startedAt,
            notes: session.notes || null,
            targetSpecies: session.targetSpecies || [],
            contactPhone: session.contactPhone || null,
          })
          .onConflictDoUpdate({
            target: activeSessionsTable.id,
            set: {
              spotId: session.spotId,
              spotName: session.spotName,
              latitude: Number(session.latitude),
              longitude: Number(session.longitude),
              notes: session.notes || null,
            },
          })
          .returning(),
      'dbSaveSession'
    );
  } catch (error) {
    console.error('dbSaveSession error:', error);
    throw new Error('Falha ao atualizar sessão ativa.', { cause: error });
  }
}

export async function dbDeleteSession(sessionId: string) {
  try {
    return await withDbRetry(
      () => db.delete(activeSessionsTable).where(eq(activeSessionsTable.id, sessionId)).returning(),
      'dbDeleteSession'
    );
  } catch (error) {
    console.error('dbDeleteSession error:', error);
    throw new Error('Falha ao encerrar sessão ativa.', { cause: error });
  }
}

// Chat Messages
export async function dbGetMessages() {
  try {
    return await withDbRetry(() => db.select().from(chatMessagesTable), 'dbGetMessages');
  } catch (error) {
    console.error('dbGetMessages error:', error);
    throw new Error('Falha ao consultar mensagens do chat no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveMessage(msg: any) {
  try {
    return await withDbRetry(
      () =>
        db
          .insert(chatMessagesTable)
          .values({
            id: msg.id,
            userId: msg.userId || msg.senderId || 'anon',
            userName: msg.userName || msg.senderName || 'Pescador',
            userAvatar: msg.userAvatar || msg.senderAvatar || null,
            text: msg.text ?? msg.content ?? '',
            timestamp: msg.timestamp || new Date().toISOString(),
            spotMention: msg.spotPin?.name || null,
            spotId: msg.spotPin?.id || null,
          })
          .onConflictDoNothing({ target: chatMessagesTable.id })
          .returning(),
      'dbSaveMessage'
    );
  } catch (error) {
    console.error('dbSaveMessage error:', error);
    throw new Error('Falha ao salvar mensagem.', { cause: error });
  }
}

export async function dbDeleteMessage(msgId: string) {
  try {
    return await withDbRetry(
      () => db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, msgId)).returning(),
      'dbDeleteMessage'
    );
  } catch (error) {
    console.error('dbDeleteMessage error:', error);
    throw new Error('Falha ao remover mensagem.', { cause: error });
  }
}

// Tournaments
function mapTournamentRow(r: any) {
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    startDate: r.startDate,
    endDate: r.endDate,
    spotName: r.location || 'Barrantuba',
    targetSpecies: Array.isArray(r.targetSpecies) ? r.targetSpecies : [],
    prizes: Array.isArray(r.prizes) ? r.prizes : [],
    entryFee: r.entryFee || 'Gratuita',
    rules: Array.isArray(r.rules) ? r.rules : [],
    registeredUserIds: Array.isArray(r.registeredUserIds) ? r.registeredUserIds : [],
    maxParticipants: Number(r.maxParticipants) || 30,
    bannerUrl: r.bannerUrl || undefined,
    status: r.status || 'upcoming',
    modality: r.modality || '',
    scoringSystem: r.scoringSystem || '',
    organizerContact: r.organizerContact || '',
    createdByUserId: r.createdByUserId || 'user_admin',
    createdAt: r.createdAt || r.startDate,
  };
}

export async function dbGetTournaments() {
  try {
    const rows = await withDbRetry(() => db.select().from(tournamentsTable), 'dbGetTournaments');
    return rows.map(mapTournamentRow);
  } catch (error) {
    console.error('dbGetTournaments error:', error);
    throw new Error('Falha ao consultar torneios no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveTournament(tourn: any) {
  try {
    return await withDbRetry(async () => {
      const resolvedLocation = String(tourn.location || tourn.spotName || 'Barrantuba').trim() || 'Barrantuba';
      const resolvedBanner =
        typeof tourn.bannerUrl === 'string' && tourn.bannerUrl.trim() ? tourn.bannerUrl.trim() : null;
      const resolvedModality =
        typeof tourn.modality === 'string' && tourn.modality.trim() ? tourn.modality.trim() : null;
      const resolvedScoring =
        typeof tourn.scoringSystem === 'string' && tourn.scoringSystem.trim()
          ? tourn.scoringSystem.trim()
          : null;
      const resolvedContact =
        typeof tourn.organizerContact === 'string' && tourn.organizerContact.trim()
          ? tourn.organizerContact.trim()
          : null;

      const saved = await db
        .insert(tournamentsTable)
        .values({
          id: tourn.id,
          title: tourn.title,
          description: tourn.description || '',
          startDate: tourn.startDate,
          endDate: tourn.endDate,
          location: resolvedLocation,
          targetSpecies: tourn.targetSpecies || [],
          prizes: tourn.prizes || [],
          rules: tourn.rules || [],
          registeredUserIds: tourn.registeredUserIds || [],
          bannerUrl: resolvedBanner,
          entryFee: tourn.entryFee ?? 'Gratuita',
          maxParticipants: Number(tourn.maxParticipants) || 30,
          modality: resolvedModality,
          scoringSystem: resolvedScoring,
          organizerContact: resolvedContact,
          createdByUserId: tourn.createdByUserId || null,
          createdAt: tourn.createdAt || new Date().toISOString(),
          status: tourn.status || 'upcoming',
        })
        .onConflictDoUpdate({
          target: tournamentsTable.id,
          set: {
            title: tourn.title,
            description: tourn.description || '',
            startDate: tourn.startDate,
            endDate: tourn.endDate,
            location: resolvedLocation,
            targetSpecies: tourn.targetSpecies || [],
            prizes: tourn.prizes || [],
            rules: tourn.rules || [],
            registeredUserIds: tourn.registeredUserIds || [],
            bannerUrl: resolvedBanner,
            entryFee: tourn.entryFee ?? 'Gratuita',
            maxParticipants: Number(tourn.maxParticipants) || 30,
            modality: resolvedModality,
            scoringSystem: resolvedScoring,
            organizerContact: resolvedContact,
            status: tourn.status || 'upcoming',
          },
        })
        .returning();

      return saved.map(mapTournamentRow);
    }, 'dbSaveTournament');
  } catch (error) {
    console.error('dbSaveTournament error:', error);
    throw new Error('Falha ao salvar torneio.', { cause: error });
  }
}

export async function dbDeleteTournament(tournamentId: string) {
  try {
    return await withDbRetry(
      () => db.delete(tournamentsTable).where(eq(tournamentsTable.id, tournamentId)).returning(),
      'dbDeleteTournament'
    );
  } catch (error) {
    console.error('dbDeleteTournament error:', error);
    throw new Error('Falha ao remover torneio.', { cause: error });
  }
}

// Notifications
export async function dbGetNotifications() {
  try {
    const rows = await withDbRetry(() => db.select().from(notificationsTable), 'dbGetNotifications');
    return rows
      .map(r => ({
        ...r,
        read: r.read === 'true'
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('dbGetNotifications error:', error);
    throw new Error('Falha ao consultar notificações no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveNotification(notif: any) {
  try {
    return await withDbRetry(
      () =>
        db
          .insert(notificationsTable)
          .values({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type || 'admin',
            timestamp: notif.timestamp || new Date().toISOString(),
            read: notif.read ? 'true' : 'false',
            linkTab: notif.linkTab || null,
          })
          .onConflictDoUpdate({
            target: notificationsTable.id,
            set: {
              read: notif.read ? 'true' : 'false',
            },
          })
          .returning(),
      'dbSaveNotification'
    );
  } catch (error) {
    console.error('dbSaveNotification error:', error);
    throw new Error('Falha ao salvar notificação.', { cause: error });
  }
}

export async function dbMarkNotificationRead(notifId: string) {
  try {
    return await withDbRetry(
      () =>
        db
          .update(notificationsTable)
          .set({ read: 'true' })
          .where(eq(notificationsTable.id, notifId))
          .returning(),
      'dbMarkNotificationRead'
    );
  } catch (error) {
    console.error('dbMarkNotificationRead error:', error);
    throw new Error('Falha ao marcar notificação como lida.', { cause: error });
  }
}

// Settings
export async function dbGetSetting(key: string) {
  try {
    const res = await withDbRetry(
      () => db.select().from(clubSettingsTable).where(eq(clubSettingsTable.key, key)),
      `dbGetSetting:${key}`
    );
    return res[0]?.value || null;
  } catch (error) {
    console.error('dbGetSetting error:', error);
    throw new Error(`Falha ao ler configuração (${key}) no PostgreSQL.`, { cause: error });
  }
}

export async function dbSetSetting(key: string, value: string) {
  try {
    return await withDbRetry(
      () =>
        db
          .insert(clubSettingsTable)
          .values({ key, value })
          .onConflictDoUpdate({
            target: clubSettingsTable.key,
            set: { value },
          })
          .returning(),
      `dbSetSetting:${key}`
    );
  } catch (error) {
    console.error('dbSetSetting error:', error);
    throw new Error('Falha ao salvar configuração.', { cause: error });
  }
}

function mapFeedPostRow(r: any) {
  const likes = Array.isArray(r.likes) ? r.likes.filter((id: string) => !BOT_USER_IDS.has(id)) : [];
  const comments = Array.isArray(r.comments) ? r.comments.filter((c: any) => !BOT_USER_IDS.has(c.userId)) : [];
  const mediaUrls = Array.isArray(r.mediaUrls) ? r.mediaUrls : [];
  const hashtags = Array.isArray(r.hashtags) ? r.hashtags : [];
  const savedBy = Array.isArray(r.savedBy) ? r.savedBy : [];

  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    userAvatar: r.userAvatar || undefined,
    userHandle: r.userHandle || undefined,
    createdAt: r.createdAt,
    category: r.category || 'Pesca',
    text: r.text || '',
    mediaUrls,
    mediaType: r.mediaType === 'video' ? 'video' : 'image',
    hashtags,
    likes,
    likesCount: likes.length > 0 ? likes.length : Number(r.likesCount || 0),
    comments,
    commentsCount: comments.length > 0 ? comments.length : Number(r.commentsCount || 0),
    sharesCount: Number(r.sharesCount || 0),
    savedBy,
  };
}

function mapStoryRow(r: any) {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    userAvatar: r.userAvatar || undefined,
    userHandle: r.userHandle || undefined,
    category: r.category || 'Pesca',
    mediaUrl: r.mediaUrl,
    mediaType: r.mediaType === 'video' ? 'video' : 'image',
    caption: r.caption || undefined,
    createdAt: r.createdAt,
    viewedBy: Array.isArray(r.viewedBy) ? r.viewedBy : [],
  };
}

// Atomic Feed Posts stored in dedicated PostgreSQL table (feed_posts)
export async function dbGetFeedPosts() {
  try {
    const rows = await withDbRetry(() => db.select().from(feedPostsTable), 'dbGetFeedPosts');
    return rows
      .filter((p: any) => !BOT_POST_IDS.has(p.id) && !BOT_USER_IDS.has(p.userId))
      .map(mapFeedPostRow)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('dbGetFeedPosts error:', error);
    throw new Error('Falha ao consultar publicações no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveFeedPost(post: any) {
  try {
    if (!post?.id || !post?.userId) {
      throw new Error('Publicação inválida: id e userId são obrigatórios.');
    }
    const likes = Array.isArray(post.likes) ? post.likes.filter((id: string) => !BOT_USER_IDS.has(id)) : [];
    const comments = Array.isArray(post.comments) ? post.comments.filter((c: any) => !BOT_USER_IDS.has(c.userId)) : [];
    const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
    const hashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
    const savedBy = Array.isArray(post.savedBy) ? post.savedBy : [];
    const likesCount = likes.length > 0 ? likes.length : Number(post.likesCount || 0);
    const commentsCount = comments.length > 0 ? comments.length : Number(post.commentsCount || 0);
    const sharesCount = Number(post.sharesCount || 0);

    const saved = await withDbRetry(
      () =>
        db
          .insert(feedPostsTable)
          .values({
            id: post.id,
            userId: post.userId,
            userName: post.userName || 'Pescador',
            userAvatar: post.userAvatar || null,
            userHandle: post.userHandle || null,
            createdAt: post.createdAt || new Date().toISOString(),
            category: post.category || 'Pesca',
            text: post.text || '',
            mediaUrls,
            mediaType: post.mediaType === 'video' ? 'video' : 'image',
            hashtags,
            likes,
            likesCount,
            comments,
            commentsCount,
            sharesCount,
            savedBy,
          })
          .onConflictDoUpdate({
            target: feedPostsTable.id,
            set: {
              userName: post.userName || 'Pescador',
              userAvatar: post.userAvatar || null,
              userHandle: post.userHandle || null,
              category: post.category || 'Pesca',
              text: post.text || '',
              mediaUrls,
              mediaType: post.mediaType === 'video' ? 'video' : 'image',
              hashtags,
              likes,
              likesCount,
              comments,
              commentsCount,
              sharesCount,
              savedBy,
            },
          })
          .returning(),
      'dbSaveFeedPost'
    );

    return mapFeedPostRow(saved[0]);
  } catch (error) {
    console.error('dbSaveFeedPost error:', error);
    throw new Error('Falha ao salvar publicação no PostgreSQL.', { cause: error });
  }
}

export async function dbDeleteFeedPost(postId: string) {
  try {
    await withDbRetry(() => db.delete(feedPostsTable).where(eq(feedPostsTable.id, postId)), 'dbDeleteFeedPost');
    return { success: true, id: postId };
  } catch (error) {
    console.error('dbDeleteFeedPost error:', error);
    throw new Error('Falha ao excluir publicação no PostgreSQL.', { cause: error });
  }
}

export async function dbToggleLikeFeedPost(postId: string, userId: string) {
  try {
    return await withDbRetry(async () => {
      const rows = await db.select().from(feedPostsTable).where(eq(feedPostsTable.id, postId));
      if (rows.length === 0) return null;
      const row = rows[0];
      const currentLikes: string[] = Array.isArray(row.likes) ? (row.likes as string[]) : [];
      const hasLiked = currentLikes.includes(userId);
      const newLikes = hasLiked ? currentLikes.filter(id => id !== userId) : [...currentLikes, userId];

      const updated = await db
        .update(feedPostsTable)
        .set({
          likes: newLikes,
          likesCount: newLikes.length,
        })
        .where(eq(feedPostsTable.id, postId))
        .returning();

      return updated[0] ? mapFeedPostRow(updated[0]) : null;
    }, 'dbToggleLikeFeedPost');
  } catch (error) {
    console.error('dbToggleLikeFeedPost error:', error);
    throw new Error('Falha ao curtir publicação no PostgreSQL.', { cause: error });
  }
}

export async function dbAddCommentFeedPost(postId: string, comment: any) {
  try {
    return await withDbRetry(async () => {
      const rows = await db.select().from(feedPostsTable).where(eq(feedPostsTable.id, postId));
      if (rows.length === 0) return null;
      const row = rows[0];
      const currentComments: any[] = Array.isArray(row.comments) ? (row.comments as any[]) : [];
      const nextComments = [...currentComments, comment];

      const updated = await db
        .update(feedPostsTable)
        .set({
          comments: nextComments,
          commentsCount: nextComments.length,
        })
        .where(eq(feedPostsTable.id, postId))
        .returning();

      return updated[0] ? mapFeedPostRow(updated[0]) : null;
    }, 'dbAddCommentFeedPost');
  } catch (error) {
    console.error('dbAddCommentFeedPost error:', error);
    throw new Error('Falha ao comentar publicação no PostgreSQL.', { cause: error });
  }
}

export async function dbShareFeedPost(postId: string) {
  try {
    const updated = await withDbRetry(
      () =>
        db
          .update(feedPostsTable)
          .set({
            sharesCount: sql`COALESCE(${feedPostsTable.sharesCount}, 0) + 1`,
          })
          .where(eq(feedPostsTable.id, postId))
          .returning(),
      'dbShareFeedPost'
    );

    return updated[0] ? mapFeedPostRow(updated[0]) : null;
  } catch (error) {
    console.error('dbShareFeedPost error:', error);
    throw new Error('Falha ao compartilhar publicação no PostgreSQL.', { cause: error });
  }
}

// Atomic 24h Stories stored in dedicated PostgreSQL table (feed_stories)
export async function dbGetStories() {
  try {
    const rows = await withDbRetry(() => db.select().from(storiesTable), 'dbGetStories');
    const now = Date.now();
    const expiredIds: string[] = [];
    const valid: any[] = [];

    for (const s of rows) {
      if (BOT_STORY_IDS.has(s.id) || BOT_USER_IDS.has(s.userId)) {
        expiredIds.push(s.id);
        continue;
      }
      const diff = now - new Date(s.createdAt).getTime();
      if (!Number.isNaN(diff) && diff >= 24 * 3600 * 1000) {
        expiredIds.push(s.id);
        continue;
      }
      valid.push(mapStoryRow(s));
    }

    if (expiredIds.length > 0) {
      for (const id of expiredIds) {
        await db.delete(storiesTable).where(eq(storiesTable.id, id));
      }
    }

    return valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('dbGetStories error:', error);
    throw new Error('Falha ao consultar stories no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveStory(story: any) {
  try {
    if (!story?.id || !story?.userId || !story?.mediaUrl) {
      throw new Error('Story inválido: id, userId e mediaUrl são obrigatórios.');
    }
    const viewedBy = Array.isArray(story.viewedBy) ? story.viewedBy : [];

    const saved = await withDbRetry(
      () =>
        db
          .insert(storiesTable)
          .values({
            id: story.id,
            userId: story.userId,
            userName: story.userName || 'Pescador',
            userAvatar: story.userAvatar || null,
            userHandle: story.userHandle || null,
            category: story.category || 'Pesca',
            mediaUrl: story.mediaUrl,
            mediaType: story.mediaType === 'video' ? 'video' : 'image',
            caption: story.caption || null,
            createdAt: story.createdAt || new Date().toISOString(),
            viewedBy,
          })
          .onConflictDoUpdate({
            target: storiesTable.id,
            set: {
              userName: story.userName || 'Pescador',
              userAvatar: story.userAvatar || null,
              userHandle: story.userHandle || null,
              category: story.category || 'Pesca',
              mediaUrl: story.mediaUrl,
              mediaType: story.mediaType === 'video' ? 'video' : 'image',
              caption: story.caption || null,
              viewedBy,
            },
          })
          .returning(),
      'dbSaveStory'
    );

    return mapStoryRow(saved[0]);
  } catch (error) {
    console.error('dbSaveStory error:', error);
    throw new Error('Falha ao salvar story no PostgreSQL.', { cause: error });
  }
}

export async function dbDeleteStory(storyId: string) {
  try {
    await withDbRetry(() => db.delete(storiesTable).where(eq(storiesTable.id, storyId)), 'dbDeleteStory');
    return { success: true, id: storyId };
  } catch (error) {
    console.error('dbDeleteStory error:', error);
    throw new Error('Falha ao excluir story no PostgreSQL.', { cause: error });
  }
}

// Ensure all 20 PostgreSQL tables exist (skipping DDL if schema is already provisioned) & migrate legacy blobs
export async function ensureDatabaseTablesExist() {
  try {
    const tableCheck = await withDbRetry(
      () => db.execute(sql`SELECT count(*)::int AS cnt FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'tackle_saved_kits')`),
      'ensureDatabaseTablesExist:check'
    );
    const existingCount = Number((tableCheck as any)?.rows?.[0]?.cnt ?? 0);
    if (existingCount < 2) {
      await withDbRetry(async () => {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS users (
          id text PRIMARY KEY,
          name text NOT NULL,
          email text NOT NULL UNIQUE,
          role text NOT NULL DEFAULT 'member',
          avatar text,
          phone text,
          city text,
          password_hash text,
          equipment jsonb,
          preferred_species jsonb,
          joined_date text,
          bio text,
          created_at timestamp DEFAULT now()
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS fishing_spots (
          id text PRIMARY KEY,
          name text NOT NULL,
          description text,
          latitude double precision NOT NULL,
          longitude double precision NOT NULL,
          water_type text NOT NULL,
          access_type text NOT NULL,
          structure_notes text,
          recommended_baits jsonb,
          target_species jsonb,
          depth_meters double precision,
          rating double precision DEFAULT 5.0,
          image_url text,
          created_by_user_id text,
          created_by_user_name text,
          created_at text
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS fish_catches (
          id text PRIMARY KEY,
          species text NOT NULL,
          weight_kg double precision NOT NULL,
          length_cm double precision NOT NULL,
          bait_used text NOT NULL,
          spot_id text NOT NULL,
          spot_name text NOT NULL,
          user_id text NOT NULL,
          user_name text NOT NULL,
          user_avatar text,
          photo_url text NOT NULL,
          captured_at text NOT NULL,
          notes text,
          water_condition text,
          moon_phase text,
          weather_temp text,
          likes_count integer DEFAULT 0
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS active_sessions (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          user_name text NOT NULL,
          user_avatar text,
          spot_id text NOT NULL,
          spot_name text NOT NULL,
          latitude double precision NOT NULL,
          longitude double precision NOT NULL,
          started_at text NOT NULL,
          notes text,
          target_species jsonb,
          contact_phone text
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          user_name text NOT NULL,
          user_avatar text,
          text text NOT NULL,
          timestamp text NOT NULL,
          spot_mention text,
          spot_id text
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tournaments (
          id text PRIMARY KEY,
          title text NOT NULL,
          description text NOT NULL,
          start_date text NOT NULL,
          end_date text NOT NULL,
          location text NOT NULL,
          target_species jsonb,
          prizes jsonb,
          rules jsonb,
          registered_user_ids jsonb,
          banner_url text,
          entry_fee text DEFAULT 'Gratuita',
          max_participants integer DEFAULT 30,
          modality text,
          scoring_system text,
          organizer_contact text,
          created_by_user_id text,
          created_at text,
          status text NOT NULL
        );
      `);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee text DEFAULT 'Gratuita';`);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 30;`);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS modality text;`);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS scoring_system text;`);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS organizer_contact text;`);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_by_user_id text;`);
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_at text;`);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS app_notifications (
          id text PRIMARY KEY,
          title text NOT NULL,
          message text NOT NULL,
          type text NOT NULL,
          timestamp text NOT NULL,
          read text DEFAULT 'false',
          link_tab text
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS club_settings (
          key text PRIMARY KEY,
          value text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS feed_posts (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          user_name text NOT NULL,
          user_avatar text,
          user_handle text,
          created_at text NOT NULL,
          category text NOT NULL,
          text text NOT NULL DEFAULT '',
          media_urls jsonb,
          media_type text,
          hashtags jsonb,
          likes jsonb,
          likes_count integer DEFAULT 0,
          comments jsonb,
          comments_count integer DEFAULT 0,
          shares_count integer DEFAULT 0,
          saved_by jsonb
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS feed_stories (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          user_name text NOT NULL,
          user_avatar text,
          user_handle text,
          category text,
          media_url text NOT NULL,
          media_type text NOT NULL,
          caption text,
          created_at text NOT NULL,
          viewed_by jsonb
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS species_photos (
          species_id text PRIMARY KEY,
          species_name text NOT NULL,
          image_data text NOT NULL,
          default_image_data text NOT NULL,
          is_custom text DEFAULT 'false',
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS city_species_cache (
          city_key text PRIMARY KEY,
          city_name text NOT NULL,
          latitude double precision NOT NULL,
          longitude double precision NOT NULL,
          water_environment text NOT NULL,
          species_data jsonb NOT NULL,
          source_label text NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS bait_photos (
          bait_id text PRIMARY KEY,
          bait_name text NOT NULL,
          category text NOT NULL,
          image_data text NOT NULL,
          source_label text NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS species_bait_guides (
          species_id text PRIMARY KEY,
          species_name text NOT NULL,
          scientific_name text NOT NULL,
          baits_data jsonb NOT NULL,
          research_summary text NOT NULL,
          source_label text NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tackle_species (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tackle_rods (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tackle_reels (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tackle_lines (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tackle_baits (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at text NOT NULL
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tackle_saved_kits (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          species_id text NOT NULL,
          species_name text NOT NULL,
          fishing_mode text NOT NULL,
          bait_preference text NOT NULL,
          kit_data jsonb NOT NULL,
          created_at text NOT NULL
        );
      `);
      }, 'ensureDatabaseTablesExist');
    }

    // Migrate legacy feed_posts blob from club_settings if present
    const legacyPostsRaw = await dbGetSetting('feed_posts').catch(() => null);
    if (legacyPostsRaw && legacyPostsRaw !== '[]') {
      try {
        const legacyPosts = JSON.parse(legacyPostsRaw);
        if (Array.isArray(legacyPosts)) {
          for (const p of legacyPosts) {
            if (!p?.id || !p?.userId || BOT_POST_IDS.has(p.id) || BOT_USER_IDS.has(p.userId)) continue;
            await db
              .insert(feedPostsTable)
              .values({
                id: p.id,
                userId: p.userId,
                userName: p.userName || 'Pescador',
                userAvatar: p.userAvatar || null,
                userHandle: p.userHandle || null,
                createdAt: p.createdAt || new Date().toISOString(),
                category: p.category || 'Pesca',
                text: p.text || '',
                mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
                mediaType: p.mediaType === 'video' ? 'video' : 'image',
                hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
                likes: Array.isArray(p.likes) ? p.likes : [],
                likesCount: Array.isArray(p.likes) ? p.likes.length : Number(p.likesCount || 0),
                comments: Array.isArray(p.comments) ? p.comments : [],
                commentsCount: Array.isArray(p.comments) ? p.comments.length : Number(p.commentsCount || 0),
                sharesCount: Number(p.sharesCount || 0),
                savedBy: Array.isArray(p.savedBy) ? p.savedBy : [],
              })
              .onConflictDoNothing({ target: feedPostsTable.id });
          }
        }
        await db.delete(clubSettingsTable).where(eq(clubSettingsTable.key, 'feed_posts'));
      } catch (migErr) {
        console.warn('Legacy feed_posts migration skipped:', migErr);
      }
    }

    // Migrate legacy feed_stories blob from club_settings if present
    const legacyStoriesRaw = await dbGetSetting('feed_stories').catch(() => null);
    if (legacyStoriesRaw && legacyStoriesRaw !== '[]') {
      try {
        const legacyStories = JSON.parse(legacyStoriesRaw);
        const now = Date.now();
        if (Array.isArray(legacyStories)) {
          for (const s of legacyStories) {
            if (!s?.id || !s?.userId || !s?.mediaUrl || BOT_STORY_IDS.has(s.id) || BOT_USER_IDS.has(s.userId)) continue;
            const diff = now - new Date(s.createdAt).getTime();
            if (!Number.isNaN(diff) && diff >= 24 * 3600 * 1000) continue;
            await db
              .insert(storiesTable)
              .values({
                id: s.id,
                userId: s.userId,
                userName: s.userName || 'Pescador',
                userAvatar: s.userAvatar || null,
                userHandle: s.userHandle || null,
                category: s.category || 'Pesca',
                mediaUrl: s.mediaUrl,
                mediaType: s.mediaType === 'video' ? 'video' : 'image',
                caption: s.caption || null,
                createdAt: s.createdAt || new Date().toISOString(),
                viewedBy: Array.isArray(s.viewedBy) ? s.viewedBy : [],
              })
              .onConflictDoNothing({ target: storiesTable.id });
          }
        }
        await db.delete(clubSettingsTable).where(eq(clubSettingsTable.key, 'feed_stories'));
      } catch (migErr) {
        console.warn('Legacy feed_stories migration skipped:', migErr);
      }
    }

    // Ensure valid official Barrantuba club logo exists in PostgreSQL club_settings
    const currentLogoSetting = await dbGetSetting('club_logo').catch(() => null);
    if (!currentLogoSetting || currentLogoSetting.startsWith('verify_logo') || currentLogoSetting.trim() === '') {
      await dbSetSetting('club_logo', '/assets/barrantuba_logo_crest.jpg').catch(() => {});
    }
  } catch (err) {
    console.error('Failed to ensure PostgreSQL tables exist:', err);
  }
}

// Ensure default Admin user exists in PostgreSQL
export async function ensureAdminUserExists() {
  try {
    const existing = await withDbRetry(
      () => db.select().from(usersTable).where(sql`lower(${usersTable.email}) = 'felipinhotb@gmail.com'`),
      'ensureAdminUserExists'
    );
    if (existing.length === 0) {
      console.log('Seeding initial administrator user into PostgreSQL...');
      await db.insert(usersTable).values({
        id: 'user_admin',
        name: 'Felipinho (Administrador)',
        email: 'felipinhotb@gmail.com',
        role: 'admin',
        avatar: '/src/assets/images/barrantuba_logo_crest_1793877702830.jpg',
        phone: '(11) 98765-4321',
        city: 'Barrantuba',
        passwordHash: 'barrantuba123',
        equipment: {
          rods: 'Vara Custom 17lb ação rápida',
          reels: 'Carretilha Shimano Curado DC',
          lines: 'Multifilamento 8X 30lb + Leader Fluorocarbon 0.47mm',
          boatOrKayak: 'Bass Boat c/ Motor elétrico',
          favoriteLures: 'Zaras de superfície, Sticks e Meia-água'
        },
        preferredSpecies: ['Tucunaré Azul', 'Robalo Flecha', 'Dourado do Rio'],
        joinedDate: '2026-01-01',
        bio: 'Administrador do Clube Barrantuba.'
      });
      console.log('Admin user seeded into PostgreSQL successfully.');
    }
  } catch (err) {
    console.error('Failed to ensure admin user in PostgreSQL:', err);
  }
}

// BiteTime™ 3D Transparent PNG Fish Species Catalog stored directly in PostgreSQL (species_photos)
const SPECIES_IMAGE_SEED_CONFIG = [
  { id: 'enxova', name: 'Enxova', file: 'enxova_3d.png' },
  { id: 'robalo', name: 'Robalo Flecha', file: 'robalo_flecha_3d.png' },
  { id: 'tucunare', name: 'Tucunaré Azul', file: 'tucunare_azul_3d.png' },
  { id: 'dourado', name: 'Dourado do Rio', file: 'dourado_rio_3d.png' },
  { id: 'corvina', name: 'Corvina', file: 'corvina_3d.png' },
  { id: 'hoplias_malabaricus', name: 'Traíra', file: 'traira_3d.png' },
  { id: 'oreochromis_niloticus', name: 'Tilápia-do-Nilo', file: 'tilapia_3d.png' },
  { id: 'mugil_liza', name: 'Tainha', file: 'tainha_3d.png' },
  { id: 'piaractus_mesopotamicus', name: 'Pacu / Caranha', file: 'pacu_3d.png' },
  { id: 'pseudoplatystoma_corruscans', name: 'Pintado / Surubim', file: 'pintado_3d.png' },
  { id: 'rhamdia_quelen', name: 'Jundiá', file: 'bagre_3d.png' },
  { id: 'epinephelus_marginatus', name: 'Cherne / Garoupa', file: 'garoupa_3d.png' },
  { id: 'megaleporinus_obtusidens', name: 'Piava / Piau', file: 'piava_3d.png' },
  { id: 'trachinotus_carolinus', name: 'Pampo', file: 'pampo_3d.png' },
  { id: 'geophagus_brasiliensis', name: 'Cará / Acará', file: 'cara_3d.png' },
  { id: 'prochilodus_lineatus', name: 'Curimbatá', file: 'curimbata_3d.png' },
];

export function matchSpeciesTo3DPngFile(speciesId: string, speciesName = ''): string | null {
  const s = `${speciesId} ${speciesName}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/\b(enxova|pomatomus|anchova)\b/.test(s)) return 'enxova_3d.png';
  if (/\b(robalo|centropomus)\b/.test(s)) return 'robalo_flecha_3d.png';
  if (/\b(tucunare|cichla)\b/.test(s)) return 'tucunare_azul_3d.png';
  if (/\b(dourado|salminus)\b/.test(s)) return 'dourado_rio_3d.png';
  if (/\b(corvina|micropogonias)\b/.test(s)) return 'corvina_3d.png';
  if (/\b(traira|trairao|hoplias)\b/.test(s)) return 'traira_3d.png';
  if (/\b(tilapia|oreochromis)\b/.test(s)) return 'tilapia_3d.png';
  if (/\b(tainha|mugil|parati)\b/.test(s)) return 'tainha_3d.png';
  if (/\b(pacu|tambaqui|tambacu|caranha|piaractus|colossoma|mylossoma|myloplus)\b/.test(s)) return 'pacu_3d.png';
  if (/\b(pintado|surubim|cachara|pseudoplatystoma)\b/.test(s)) return 'pintado_3d.png';
  if (/\b(jundia|bagre|rhamdia|genidens)\b/.test(s)) return 'bagre_3d.png';
  if (/\b(garoupa|cherne|badejo|epinephelus|hyporthodus|mycteroperca)\b/.test(s)) return 'garoupa_3d.png';
  if (/\b(piava|piau|piapara|leporinus|megaleporinus|schizodon)\b/.test(s)) return 'piava_3d.png';
  if (/\b(pampo|trachinotus)\b/.test(s)) return 'pampo_3d.png';
  if (/\b(cara|acara|geophagus)\b/.test(s)) return 'cara_3d.png';
  if (/\b(curimbata|curimba|prochilodus)\b/.test(s)) return 'curimbata_3d.png';
  return null;
}

const localSpeciesDataUrlCache = new Map<string, string>();

export function loadLocalSpeciesImageDataUrl(filename: string): string | null {
  const cached = localSpeciesDataUrlCache.get(filename);
  if (cached) return cached;
  try {
    const filePath = path.resolve(process.cwd(), 'src', 'assets', 'images', filename);
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    localSpeciesDataUrlCache.set(filename, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error(`Erro ao ler imagem padrão da espécie (${filename}):`, err);
    return null;
  }
}

export function buildSpeciesPhotoUrl(speciesId: string, updatedAt?: string): string {
  return `/api/species-photos/${encodeURIComponent(speciesId)}/image?v=${encodeURIComponent(updatedAt || '1')}`;
}

function mapSpeciesPhotoMeta(r: {
  speciesId: string;
  speciesName: string;
  isCustom: string | null;
  updatedAt: string;
}) {
  return {
    speciesId: r.speciesId,
    speciesName: r.speciesName,
    imageData: buildSpeciesPhotoUrl(r.speciesId, r.updatedAt),
    isCustom: r.isCustom === 'true',
    updatedAt: r.updatedAt,
  };
}

export async function ensureSpeciesPhotosSeeded() {
  try {
    const nowIso = new Date().toISOString();

    const existingRows = await withDbRetry(
      () =>
        db
          .select({
            speciesId: speciesPhotosTable.speciesId,
            speciesName: speciesPhotosTable.speciesName,
            isCustom: speciesPhotosTable.isCustom,
            imagePrefix: sql<string>`LEFT(${speciesPhotosTable.imageData}, 30)`,
            defaultPrefix: sql<string>`LEFT(${speciesPhotosTable.defaultImageData}, 30)`,
          })
          .from(speciesPhotosTable),
      'ensureSpeciesPhotosSeeded:select'
    );

    const existingMap = new Map(existingRows.map(r => [r.speciesId, r]));

    for (const item of SPECIES_IMAGE_SEED_CONFIG) {
      const defaultDataUrl = loadLocalSpeciesImageDataUrl(item.file);
      if (!defaultDataUrl) continue;

      const row = existingMap.get(item.id);
      if (!row) {
        const legacyKey = `species_photo_${item.id}`;
        const legacyCustom = await dbGetSetting(legacyKey).catch(() => null);
        const hasLegacyCustom = Boolean(legacyCustom && legacyCustom.startsWith('data:image/'));
        await db
          .insert(speciesPhotosTable)
          .values({
            speciesId: item.id,
            speciesName: item.name,
            imageData: hasLegacyCustom ? legacyCustom! : defaultDataUrl,
            defaultImageData: defaultDataUrl,
            isCustom: hasLegacyCustom ? 'true' : 'false',
            updatedAt: nowIso,
          })
          .onConflictDoNothing({ target: speciesPhotosTable.speciesId });
        if (legacyCustom) {
          await db.delete(clubSettingsTable).where(eq(clubSettingsTable.key, legacyKey));
        }
      } else {
        const isUserCustom = row.isCustom === 'true';
        const needsPngUpgrade = !isUserCustom && !String(row.imagePrefix || '').startsWith('data:image/png;base64,');
        const needsDefaultUpgrade = !String(row.defaultPrefix || '').startsWith('data:image/png;base64,');
        if (needsPngUpgrade || needsDefaultUpgrade) {
          await db
            .update(speciesPhotosTable)
            .set({
              defaultImageData: defaultDataUrl,
              ...(isUserCustom ? {} : { imageData: defaultDataUrl, updatedAt: nowIso }),
            })
            .where(eq(speciesPhotosTable.speciesId, item.id));
        }
      }
    }

    // Batch-upgrade all non-custom iNaturalist / binomial species rows that map to our 3D transparent PNGs
    const upgradeGroups = new Map<string, string[]>();
    for (const r of existingRows) {
      if (r.isCustom === 'true') continue;
      if (String(r.imagePrefix || '').startsWith('data:image/png;base64,')) continue;
      const pngFile = matchSpeciesTo3DPngFile(r.speciesId, r.speciesName);
      if (!pngFile) continue;
      const list = upgradeGroups.get(pngFile) || [];
      list.push(r.speciesId);
      upgradeGroups.set(pngFile, list);
    }

    for (const [pngFile, ids] of upgradeGroups.entries()) {
      const pngDataUrl = loadLocalSpeciesImageDataUrl(pngFile);
      if (!pngDataUrl || ids.length === 0) continue;
      await db
        .update(speciesPhotosTable)
        .set({
          imageData: pngDataUrl,
          defaultImageData: pngDataUrl,
          updatedAt: nowIso,
        })
        .where(inArray(speciesPhotosTable.speciesId, ids));
    }
  } catch (error) {
    console.error('ensureSpeciesPhotosSeeded error:', error);
  }
}

export async function dbGetSpeciesPhotos() {
  try {
    const rows = await withDbRetry(
      () =>
        db
          .select({
            speciesId: speciesPhotosTable.speciesId,
            speciesName: speciesPhotosTable.speciesName,
            isCustom: speciesPhotosTable.isCustom,
            updatedAt: speciesPhotosTable.updatedAt,
          })
          .from(speciesPhotosTable),
      'dbGetSpeciesPhotos'
    );

    if (rows.length === 0) {
      await ensureSpeciesPhotosSeeded();
      const seeded = await db
        .select({
          speciesId: speciesPhotosTable.speciesId,
          speciesName: speciesPhotosTable.speciesName,
          isCustom: speciesPhotosTable.isCustom,
          updatedAt: speciesPhotosTable.updatedAt,
        })
        .from(speciesPhotosTable);
      return seeded.map(mapSpeciesPhotoMeta);
    }
    return rows.map(mapSpeciesPhotoMeta);
  } catch (error) {
    console.error('dbGetSpeciesPhotos error:', error);
    throw new Error('Falha ao consultar fotos das espécies no PostgreSQL.', { cause: error });
  }
}

function decodeDataUrlToBinary(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

export async function dbGetSpeciesPhotoBinary(
  speciesId: string
): Promise<{ contentType: string; buffer: Buffer; updatedAt: string } | { redirectUrl: string } | null> {
  try {
    const rows = await withDbRetry(
      () =>
        db
          .select()
          .from(speciesPhotosTable)
          .where(eq(speciesPhotosTable.speciesId, speciesId)),
      `dbGetSpeciesPhotoBinary:${speciesId}`
    );

    const row = rows[0];
    if (!row) {
      const matchedFile =
        SPECIES_IMAGE_SEED_CONFIG.find(s => s.id === speciesId)?.file ||
        matchSpeciesTo3DPngFile(speciesId);
      if (matchedFile) {
        const localDataUrl = loadLocalSpeciesImageDataUrl(matchedFile);
        if (localDataUrl) {
          const decoded = decodeDataUrlToBinary(localDataUrl);
          if (decoded) return { ...decoded, updatedAt: '2' };
        }
      }
      return null;
    }

    const activeStr = row.imageData || row.defaultImageData;
    if (!activeStr) return null;

    const isCustom = row.isCustom === 'true';
    if (!isCustom && !activeStr.startsWith('data:image/png;base64,')) {
      const matchedFile =
        SPECIES_IMAGE_SEED_CONFIG.find(s => s.id === speciesId)?.file ||
        matchSpeciesTo3DPngFile(speciesId, row.speciesName || '');
      if (matchedFile) {
        const pngDataUrl = loadLocalSpeciesImageDataUrl(matchedFile);
        if (pngDataUrl) {
          const decoded = decodeDataUrlToBinary(pngDataUrl);
          if (decoded) {
            const nowIso = new Date().toISOString();
            void db
              .update(speciesPhotosTable)
              .set({ imageData: pngDataUrl, defaultImageData: pngDataUrl, updatedAt: nowIso })
              .where(eq(speciesPhotosTable.speciesId, speciesId))
              .catch(() => {});
            return { ...decoded, updatedAt: nowIso };
          }
        }
      }
    }

    if (activeStr.startsWith('data:image/')) {
      const decoded = decodeDataUrlToBinary(activeStr);
      if (decoded) return { ...decoded, updatedAt: row.updatedAt };
    }

    if (activeStr.startsWith('http://') || activeStr.startsWith('https://')) {
      try {
        const res = await fetch(activeStr, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
          if (ct.startsWith('image/')) {
            const arr = await res.arrayBuffer();
            const buffer = Buffer.from(arr);
            const dataUrl = `data:${ct};base64,${buffer.toString('base64')}`;
            await db
              .update(speciesPhotosTable)
              .set({
                imageData: dataUrl,
                defaultImageData: row.defaultImageData.startsWith('http') ? dataUrl : row.defaultImageData,
              })
              .where(eq(speciesPhotosTable.speciesId, speciesId));
            return { contentType: ct, buffer, updatedAt: row.updatedAt };
          }
        }
      } catch {
        // fallback redirect if remote fetch fails transiently
      }
      return { redirectUrl: activeStr };
    }

    return null;
  } catch (error) {
    console.error('dbGetSpeciesPhotoBinary error:', error);
    return null;
  }
}

export async function dbSaveSpeciesPhoto(speciesId: string, speciesName: string, imageData: string) {
  try {
    if (!speciesId || !imageData) {
      throw new Error('speciesId e imageData são obrigatórios.');
    }

    const existing = await withDbRetry(
      () => db.select().from(speciesPhotosTable).where(eq(speciesPhotosTable.speciesId, speciesId)),
      'dbSaveSpeciesPhoto:select'
    );

    const seedCfg = SPECIES_IMAGE_SEED_CONFIG.find(s => s.id === speciesId);
    const fallbackDefault =
      existing[0]?.defaultImageData ||
      (seedCfg ? loadLocalSpeciesImageDataUrl(seedCfg.file) : null) ||
      imageData;

    const resolvedName = speciesName || existing[0]?.speciesName || seedCfg?.name || speciesId;
    const nowIso = new Date().toISOString();
    const saved = await withDbRetry(
      () =>
        db
          .insert(speciesPhotosTable)
          .values({
            speciesId,
            speciesName: resolvedName,
            imageData,
            defaultImageData: fallbackDefault,
            isCustom: 'true',
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: speciesPhotosTable.speciesId,
            set: {
              speciesName: resolvedName,
              imageData,
              isCustom: 'true',
              updatedAt: nowIso,
            },
          })
          .returning({
            speciesId: speciesPhotosTable.speciesId,
            speciesName: speciesPhotosTable.speciesName,
            isCustom: speciesPhotosTable.isCustom,
            updatedAt: speciesPhotosTable.updatedAt,
          }),
      'dbSaveSpeciesPhoto:upsert'
    );

    // Sync sibling subspecies rows sharing the exact same Portuguese species name (e.g., Traíra / Tainha)
    if (resolvedName) {
      await withDbRetry(
        () =>
          db
            .update(speciesPhotosTable)
            .set({
              imageData,
              isCustom: 'true',
              updatedAt: nowIso,
            })
            .where(sql`lower(trim(${speciesPhotosTable.speciesName})) = lower(trim(${resolvedName}))`),
        'dbSaveSpeciesPhoto:syncSiblings'
      );
    }

    return mapSpeciesPhotoMeta(saved[0]);
  } catch (error) {
    console.error('dbSaveSpeciesPhoto error:', error);
    throw new Error('Falha ao salvar foto da espécie no PostgreSQL.', { cause: error });
  }
}

export async function dbRevertSpeciesPhoto(speciesId: string) {
  try {
    const existing = await withDbRetry(
      () => db.select().from(speciesPhotosTable).where(eq(speciesPhotosTable.speciesId, speciesId)),
      'dbRevertSpeciesPhoto:select'
    );

    const seedCfg = SPECIES_IMAGE_SEED_CONFIG.find(s => s.id === speciesId);
    const defaultImg =
      (seedCfg ? loadLocalSpeciesImageDataUrl(seedCfg.file) : null) ||
      existing[0]?.defaultImageData;

    if (!defaultImg) {
      throw new Error('Imagem original da espécie não encontrada.');
    }

    const resolvedName = existing[0]?.speciesName || seedCfg?.name || speciesId;
    const nowIso = new Date().toISOString();
    const updated = await withDbRetry(
      () =>
        db
          .insert(speciesPhotosTable)
          .values({
            speciesId,
            speciesName: resolvedName,
            imageData: defaultImg,
            defaultImageData: defaultImg,
            isCustom: 'false',
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: speciesPhotosTable.speciesId,
            set: {
              imageData: defaultImg,
              defaultImageData: defaultImg,
              isCustom: 'false',
              updatedAt: nowIso,
            },
          })
          .returning({
            speciesId: speciesPhotosTable.speciesId,
            speciesName: speciesPhotosTable.speciesName,
            isCustom: speciesPhotosTable.isCustom,
            updatedAt: speciesPhotosTable.updatedAt,
          }),
      'dbRevertSpeciesPhoto:upsert'
    );

    // Also restore any sibling subspecies rows back to their own stored defaultImageData
    if (resolvedName) {
      await withDbRetry(
        () =>
          db.execute(
            sql`UPDATE species_photos SET image_data = default_image_data, is_custom = 'false', updated_at = ${nowIso} WHERE lower(trim(species_name)) = lower(trim(${resolvedName})) AND default_image_data LIKE 'data:image/%'`
          ),
        'dbRevertSpeciesPhoto:syncSiblings'
      );
    }

    return mapSpeciesPhotoMeta(updated[0]);
  } catch (error) {
    console.error('dbRevertSpeciesPhoto error:', error);
    throw new Error('Falha ao restaurar foto original da espécie no PostgreSQL.', { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Tackle Equipment Recommendation Catalog & Saved Kits (PostgreSQL)
// ---------------------------------------------------------------------------

async function upsertCatalogRows<T extends { id: string }>(table: any, items: T[], label: string) {
  if (!items.length) return;
  const nowIso = new Date().toISOString();
  const existing = await withDbRetry(() => db.select({ id: table.id }).from(table), `${label}:selectIds`);
  const existingIds = new Set(existing.map((r: any) => r.id));
  const missing = items.filter(i => !existingIds.has(i.id));
  if (missing.length === 0) return;

  await withDbRetry(
    () =>
      db
        .insert(table)
        .values(missing.map(item => ({ id: item.id, data: item as any, updatedAt: nowIso })))
        .onConflictDoNothing({ target: table.id }),
    `${label}:insert`
  );
}

let tackleSeedPromise: Promise<void> | null = null;
export async function ensureTackleCatalogSeeded(): Promise<void> {
  if (tackleSeedPromise) return tackleSeedPromise;
  tackleSeedPromise = (async () => {
    try {
      await upsertCatalogRows(tackleSpeciesTable, DEFAULT_TACKLE_CATALOG.species, 'tackle_species');
      await upsertCatalogRows(tackleRodsTable, DEFAULT_TACKLE_CATALOG.rods, 'tackle_rods');
      await upsertCatalogRows(tackleReelsTable, DEFAULT_TACKLE_CATALOG.reels, 'tackle_reels');
      await upsertCatalogRows(tackleLinesTable, DEFAULT_TACKLE_CATALOG.lines, 'tackle_lines');
      await upsertCatalogRows(tackleBaitsTable, DEFAULT_TACKLE_CATALOG.baits, 'tackle_baits');
    } catch (err) {
      console.error('ensureTackleCatalogSeeded warning:', err);
      tackleSeedPromise = null;
    }
  })();
  return tackleSeedPromise;
}

export async function dbGetTackleCatalog(): Promise<TackleCatalog> {
  try {
    await ensureTackleCatalogSeeded();
    const [sp, rd, rl, ln, bt] = await withDbRetry(
      () =>
        Promise.all([
          db.select().from(tackleSpeciesTable),
          db.select().from(tackleRodsTable),
          db.select().from(tackleReelsTable),
          db.select().from(tackleLinesTable),
          db.select().from(tackleBaitsTable),
        ]),
      'dbGetTackleCatalog'
    );

    return {
      species: sp.length > 0 ? sp.map(r => r.data as any) : DEFAULT_TACKLE_CATALOG.species,
      rods: rd.length > 0 ? rd.map(r => r.data as any) : DEFAULT_TACKLE_CATALOG.rods,
      reels: rl.length > 0 ? rl.map(r => r.data as any) : DEFAULT_TACKLE_CATALOG.reels,
      lines: ln.length > 0 ? ln.map(r => r.data as any) : DEFAULT_TACKLE_CATALOG.lines,
      baits: bt.length > 0 ? bt.map(r => r.data as any) : DEFAULT_TACKLE_CATALOG.baits,
    };
  } catch (error) {
    console.error('dbGetTackleCatalog error (using default catalog):', error);
    return DEFAULT_TACKLE_CATALOG;
  }
}

export async function dbGetSavedTackleKits(userId?: string) {
  try {
    const rows = await withDbRetry(
      () =>
        userId
          ? db.select().from(tackleSavedKitsTable).where(eq(tackleSavedKitsTable.userId, userId))
          : db.select().from(tackleSavedKitsTable),
      'dbGetSavedTackleKits'
    );
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('dbGetSavedTackleKits error:', error);
    throw new Error('Falha ao consultar kits salvos no PostgreSQL.', { cause: error });
  }
}

export async function dbSaveTackleKit(kit: any) {
  try {
    const nowIso = kit.createdAt || new Date().toISOString();
    return await withDbRetry(
      () =>
        db
          .insert(tackleSavedKitsTable)
          .values({
            id: kit.id,
            userId: kit.userId,
            speciesId: kit.speciesId,
            speciesName: kit.speciesName,
            fishingMode: kit.fishingMode,
            baitPreference: kit.baitPreference,
            kitData: kit.kitData,
            createdAt: nowIso,
          })
          .onConflictDoUpdate({
            target: tackleSavedKitsTable.id,
            set: {
              speciesId: kit.speciesId,
              speciesName: kit.speciesName,
              fishingMode: kit.fishingMode,
              baitPreference: kit.baitPreference,
              kitData: kit.kitData,
            },
          })
          .returning(),
      'dbSaveTackleKit'
    );
  } catch (error) {
    console.error('dbSaveTackleKit error:', error);
    throw new Error('Falha ao salvar kit recomendado no PostgreSQL.', { cause: error });
  }
}

export async function dbDeleteTackleKit(kitId: string) {
  try {
    return await withDbRetry(
      () => db.delete(tackleSavedKitsTable).where(eq(tackleSavedKitsTable.id, kitId)).returning(),
      'dbDeleteTackleKit'
    );
  } catch (error) {
    console.error('dbDeleteTackleKit error:', error);
    throw new Error('Falha ao remover kit salvo.', { cause: error });
  }
}
