# Architecture Technique - Quizzator

## Vue d'ensemble

Quizzator est un plugin Obsidian TypeScript qui permet de créer et passer des quiz interactifs avec évaluation par IA.

## Structure du projet

```
Obsidian_Plugin/
├── src/
│   ├── main.ts                      # Plugin principal
│   ├── settings.ts                  # Gestion des paramètres
│   ├── types.d.ts                   # Déclarations TypeScript
│   │
│   ├── models/                      # Modèles de données
│   │   ├── question.ts             # Types de questions
│   │   └── quiz.ts                 # Modèle de quiz
│   │
│   ├── parsers/                     # Parsing YAML
│   │   └── yaml-parser.ts          # Extraction et parsing
│   │
│   ├── llm/                         # Providers LLM
│   │   ├── llm-provider.ts         # Interface commune
│   │   ├── openai-provider.ts      # OpenAI API
│   │   ├── anthropic-provider.ts   # Anthropic API
│   │   └── ollama-provider.ts      # Ollama local
│   │
│   ├── ui/                          # Interface utilisateur
│   │   ├── quiz-modal.ts           # Modal de quiz
│   │   └── sidebar-view.ts         # Vue latérale
│   │
│   └── utils/                       # Utilitaires
│       ├── scoring.ts              # Système de scoring
│       └── quiz-finder.ts          # Recherche de quiz
│
├── styles/
│   └── styles.css                   # CSS du plugin
│
├── manifest.json                    # Métadonnées du plugin
├── package.json                     # Dépendances NPM
├── tsconfig.json                    # Config TypeScript
└── esbuild.config.mjs              # Config build
```

## Architecture en couches

### Layer 1 : Models (Modèles de données)

**question.ts**
- Types de questions : `FreeTextQuestion`, `MCQQuestion`, `SliderQuestion`, `TrueFalseQuestion`
- Interface unifiée : `Question` (union type)
- Résultats : `QuestionResult` avec score, status, explication
- Helper : `getQuestionStatus()` pour déterminer ✓/~/✗

**quiz.ts**
- Structure `Quiz` avec titre, description, scoring, questions
- `QuizScoring` : seuils min_score_to_pass / min_score_to_fail
- `QuizResult` : résultat final avec score pondéré
- Fonction `calculateQuizResult()` pour calculer le score final

### Layer 2 : Parsers (Parsing YAML)

**yaml-parser.ts**
- `parseQuizYAML(yamlContent)` : Parse YAML → objet `Quiz`
- Validation complète des champs requis
- Vérification des types par question
- `extractQuizFromMarkdown(content)` : Extrait YAML du frontmatter
- Gestion d'erreurs avec messages clairs

### Layer 3 : LLM Providers (Évaluation IA)

**llm-provider.ts** (Interface)
```typescript
interface LLMProvider {
    evaluateAnswer(question, userAnswer): Promise<LLMEvaluationResult>
    testConnection(): Promise<boolean>
}
```

**Implémentations**
- `OpenAIProvider` : Utilise l'API OpenAI via fetch
- `AnthropicProvider` : Utilise l'API Anthropic via fetch
- `OllamaProvider` : Utilise Ollama en local via fetch

**Prompt Engineering**
- `buildEvaluationPrompt()` : Construit un prompt structuré
- Demande JSON : `{ score, explanation, expectedAnswer }`
- Inclut question, réponse attendue, contexte optionnel

### Layer 4 : Scoring (Évaluation)

**scoring.ts**
- `evaluateAnswer()` : Point d'entrée principal
- Routing par type de question
- **Free-text** : Délègue au LLM provider
- **MCQ** :
  - Simple : 100 ou 0
  - Multiple : Score proportionnel (correct - incorrect) / total
- **Slider** :
  - Avec tolérance : 100 si dans plage, 0 sinon (binaire)
  - Sans tolérance : exact uniquement
- **True/False** : 100 ou 0 (binaire)

### Layer 5 : UI (Interface utilisateur)

**quiz-modal.ts**
- Hérite de `Modal` (API Obsidian)
- États : currentQuestionIndex, questionResults, currentAnswer
- Rendu dynamique par type de question
- Gestion du workflow : question → évaluation → résultat → suivant
- Affichage final avec résumé détaillé

**sidebar-view.ts**
- Hérite de `ItemView` (API Obsidian)
- Liste tous les quiz du vault
- Rafraîchissement à la demande
- Lancement de quiz au clic

### Layer 6 : Main (Orchestration)

**main.ts**
- Point d'entrée du plugin
- Enregistrement des vues, commandes, ribbon icons
- Gestion du cycle de vie (onload/onunload)
- `launchQuiz()` : Charge quiz + provider LLM + ouvre modal
- `getLLMProvider()` : Factory pour créer le bon provider
- Processor markdown pour `quiz-button` code blocks

**settings.ts**
- Interface `QuizzatorSettings` pour la config
- `QuizzatorSettingTab` : UI des paramètres
- Stockage persistant via `loadData()`/`saveData()`
- UI dynamique selon le provider sélectionné

## Flux de données

### 1. Création de quiz

```
Utilisateur écrit YAML
    ↓
Sauvegarde dans note Markdown
    ↓
yaml-parser.ts extrait et parse
    ↓
Objet Quiz créé
    ↓
Stocké en mémoire / listé dans sidebar
```

### 2. Lancement de quiz

```
Utilisateur clique (sidebar/commande/bouton)
    ↓
main.ts récupère le fichier
    ↓
quiz-finder.ts charge le quiz
    ↓
main.ts crée LLMProvider selon settings
    ↓
QuizModal s'ouvre avec Quiz + Provider
```

### 3. Réponse à une question

```
Utilisateur répond
    ↓
QuizModal capture la réponse
    ↓
scoring.ts évalue selon le type
    ↓
(si free-text) → LLMProvider API call
    ↓
QuestionResult créé
    ↓
Affichage du feedback
    ↓
Passage à la question suivante
```

### 4. Résultats finaux

```
Toutes questions répondues
    ↓
quiz.ts calcule score pondéré
    ↓
Détermine status (✓/~/✗)
    ↓
QuizModal affiche résumé
    ↓
Utilisateur peut fermer
```

## Technologies utilisées

### Frontend
- **TypeScript** : Langage principal
- **Obsidian API** : Plugin, Modal, ItemView, Settings
- **CSS Variables** : Thème cohérent avec Obsidian

### Build
- **esbuild** : Bundler ultra-rapide
- **TypeScript Compiler** : Vérification de types
- **npm** : Gestion de dépendances

### APIs externes
- **OpenAI API** : GPT-4 / GPT-3.5
- **Anthropic API** : Claude 3 (Opus, Sonnet, Haiku)
- **Ollama** : Modèles locaux (llama2, mistral, etc.)

### Parsing
- **js-yaml** : Parse YAML en JavaScript objects

## Sécurité

### Stockage des clés API
- Stockées dans `.obsidian/plugins/quizzator/data.json`
- Jamais exposées côté client (sauf dans requests)
- Pas de logging des clés

### Validation
- Tous les inputs YAML validés avant parsing
- Type checking TypeScript strict
- Vérification des seuils de scoring

### API Calls
- Utilisation de `fetch` natif (pas de SDK tiers problématique)
- Headers correctement configurés
- Gestion d'erreurs robuste

## Performance

### Optimisations
- Build avec esbuild (très rapide)
- Code splitting possible si nécessaire
- CSS minimal et ciblé
- Pas de dépendances lourdes

### Lazy Loading
- LLM providers créés à la demande
- Quiz chargés uniquement quand nécessaires
- Sidebar rafraîchie manuellement

## Extensibilité

### Ajouter un nouveau type de question

1. Ajouter le type dans `models/question.ts`
2. Étendre le parser dans `parsers/yaml-parser.ts`
3. Ajouter la logique d'évaluation dans `utils/scoring.ts`
4. Créer le rendu UI dans `ui/quiz-modal.ts`
5. Ajouter les styles CSS

### Ajouter un nouveau LLM provider

1. Créer `src/llm/nouveau-provider.ts`
2. Implémenter interface `LLMProvider`
3. Ajouter le type dans `settings.ts`
4. Ajouter la factory case dans `main.ts`
5. Documenter dans README

### Ajouter un mode de sauvegarde

1. Créer `src/utils/storage.ts`
2. Définir le format (JSON, CSV, etc.)
3. Ajouter bouton "Save Results" dans `quiz-modal.ts`
4. Stocker dans vault ou fichier séparé

## Compatibilité

### Obsidian
- Version minimale : 0.15.0
- Compatible desktop et mobile
- Fonctionne avec tous les thèmes

### Navigateurs (via Obsidian)
- Chromium (desktop app)
- Electron (Obsidian est basé sur Electron)
- Pas de dépendances Node.js spécifiques

## Limitations actuelles

1. **Pas de sauvegarde d'historique** : Les résultats ne sont pas persistés
2. **Pas de retry** : Si LLM échoue, pas de nouvelle tentative auto
3. **Pas de mode offline** : Free-text nécessite connexion internet
4. **Pas de timer** : Pas de limite de temps par quiz/question
5. **Pas d'images** : Questions textuelles uniquement

## Pistes d'amélioration

### Court terme
- [ ] Ajouter historique des quiz dans `data.json`
- [ ] Mode practice (repasser un quiz)
- [ ] Export résultats en markdown
- [ ] Support des images dans questions

### Moyen terme
- [ ] Timer optionnel par quiz
- [ ] Mode flashcard
- [ ] Statistiques de progression
- [ ] Tags/catégories pour quiz

### Long terme
- [ ] Générateur de quiz par IA
- [ ] Mode collaboratif (partage de quiz)
- [ ] Intégration Spaced Repetition
- [ ] Support audio/vidéo

## Testing

### Tests manuels recommandés
1. Chaque type de question
2. Chaque LLM provider
3. Cas limites (quiz vide, mauvais YAML)
4. UI sur différentes résolutions
5. Thèmes clair/sombre

### Tests automatisés (à implémenter)
- Unit tests pour scoring
- Integration tests pour parsers
- Mock LLM responses pour tests

## Contribution

Pour contribuer :
1. Fork le projet
2. Créer une branche feature
3. Suivre la structure existante
4. Tester localement
5. Soumettre une PR

## License

MIT - Voir [LICENSE](LICENSE)
