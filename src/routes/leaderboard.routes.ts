import { Router } from "express";
import gamesController from "../controllers/leaderboard.controller";

const router: Router = Router();

// Liste tous les jeux présents en BDD avec pagination.
// Utilisé pour afficher un catalogue de jeux sur lesquels des challenges existent.
router.get("/bestChallenges", gamesController.mostPlayedChallenges);

// Recherche des jeux sur l'API IGDB sans rien persister en BDD.
// Utilisé pour l'autocomplétion lors de la création d'un challenge :
// l'utilisateur tape un nom de jeu, le front appelle cette route avec ?q=...,
// et affiche les suggestions. Chaque résultat contient un igdbId que le front
// transmet ensuite au POST /challenges pour déclencher la création du jeu en BDD.
router.get("/bestActivUsers", gamesController.mostActifUsers);

// Récupère un jeu et ses challenges via son igdbId (identifiant public stable).
// Utilisé par la barre de recherche globale et les pages de détail de jeu.
// Retourne 404 si aucun challenge n'existe encore pour ce jeu.
router.get("/bestParticipations", gamesController.mostAppreciateParticipationByCommunity);

export default router;
