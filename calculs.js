/* ============================================================================
   calculs.js — Fonctions de calcul PURES (aucune manipulation du DOM)
   ----------------------------------------------------------------------------
   Chaque fonction reçoit des nombres et RETOURNE un nombre. Aucune lecture ni
   écriture dans la page : tout l'affichage et les écouteurs vivent dans les
   pages HTML (convertisseur.html, pourcentages.html).
   Avantage : la logique est isolée, réutilisable et testable.
   ========================================================================== */

(function (global) {
    'use strict';

    const Calculs = {

        /* ---- Module 1 : Convertisseur pente / degré ---- */

        // Pente (%) → angle (degrés)
        penteVersDegre(pentePourcent) {
            return Math.atan(pentePourcent / 100) * (180 / Math.PI);
        },

        // Angle (degrés) → pente (%)
        degreVersPente(angleDegres) {
            return Math.tan(angleDegres * (Math.PI / 180)) * 100;
        },

        /* ---- Module 2 : Pourcentages ---- */

        // Quel % la valeur A représente-t-elle de la valeur B ?
        ratio(a, b) {
            return (a / b) * 100;
        },

        // Taux d'évolution (%) entre une valeur de départ A et une valeur d'arrivée B.
        // Positif = augmentation, négatif = réduction.
        tauxEvolution(a, b) {
            return ((b - a) / a) * 100;
        },

        // Application d'une variation : A ± x %.  sens = '+' (augmentation) ou '-' (réduction).
        appliquerVariation(a, pourcent, sens) {
            const signe = sens === '-' ? -1 : 1;
            return a * (1 + signe * (pourcent / 100));
        },

        // Valeur initiale (inversé) : à partir d'une valeur finale B obtenue après
        // une variation de x %, retrouve la valeur de départ A.
        valeurInitiale(b, pourcent, sens) {
            const signe = sens === '-' ? -1 : 1;
            return b / (1 + signe * (pourcent / 100));
        }
    };

    global.Calculs = Calculs;

    // Export Node (pour les tests automatisés)
    if (typeof module !== 'undefined' && module.exports) module.exports = Calculs;

})(typeof window !== 'undefined' ? window : globalThis);
