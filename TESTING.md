# Guide de Test - Quizzator

## ✅ Build réussi !

Le plugin a été compilé avec succès. Voici comment le tester.

## Installation dans Obsidian

### Option 1 : Copie manuelle

1. Copiez ces fichiers dans votre vault Obsidian :
   ```
   VotreVault/.obsidian/plugins/quizzator/
   ├── main.js          (fichier compilé)
   ├── manifest.json
   └── styles/styles.css
   ```

2. Rechargez Obsidian (Ctrl+R ou redémarrez)

3. Allez dans Settings → Community plugins → Activez "Quizzator"

### Option 2 : Lien symbolique (développement)

**Windows (PowerShell en Administrateur) :**
```powershell
New-Item -ItemType SymbolicLink -Path "C:\chemin\vers\vault\.obsidian\plugins\quizzator" -Target "C:\Users\robin\Code\Obsidian_Plugin"
```

**Mac/Linux :**
```bash
ln -s /Users/robin/Code/Obsidian_Plugin /path/to/vault/.obsidian/plugins/quizzator
```

Puis rechargez Obsidian et activez le plugin.

## Configuration

1. **Ouvrez les paramètres**
   - Settings → Quizzator

2. **Choisissez un provider LLM**

   **Option A : OpenAI (recommandé pour commencer)**
   - Provider : OpenAI
   - API Key : Votre clé sk-...
   - Model : gpt-4-turbo-preview ou gpt-3.5-turbo

   **Option B : Anthropic (Claude)**
   - Provider : Anthropic
   - API Key : Votre clé sk-ant-...
   - Model : claude-3-sonnet-20240229

   **Option C : Ollama (local, gratuit)**
   - Provider : Ollama
   - URL : http://localhost:11434
   - Model : llama2
   - Note : Ollama doit être lancé (`ollama serve`)

## Créer votre premier quiz de test

Créez une nouvelle note dans Obsidian et collez ce contenu :

```yaml
---
quiz:
  title: "Test Quiz Quizzator"
  description: "Premier test du plugin"
  scoring:
    min_score_to_pass: 70
    min_score_to_fail: 50
  questions:
    # Question True/False (pas besoin de LLM)
    - type: true-false
      q: "TypeScript est un superset de JavaScript"
      answer: true
      weight: 1

    # Question MCQ simple
    - type: mcq
      q: "Quel est le langage de markup utilisé par Obsidian ?"
      options:
        - "HTML"
        - "Markdown"
        - "LaTeX"
        - "XML"
      answer: ["Markdown"]
      multiple: false
      weight: 1

    # Question Slider
    - type: slider
      q: "En quelle année a été créé JavaScript ?"
      answer: 1995
      min: 1980
      max: 2010
      step: 1
      tolerance: 2
      weight: 1

    # Question MCQ multiple
    - type: mcq
      q: "Quels sont des langages de programmation ?"
      options:
        - "Python"
        - "HTML"
        - "Java"
        - "CSS"
      answer: ["Python", "Java"]
      multiple: true
      weight: 2

    # Question texte libre (nécessite LLM)
    - type: free-text
      q: "Qu'est-ce qu'un plugin Obsidian ?"
      answer: "Un plugin est une extension qui ajoute des fonctionnalités à Obsidian"
      context: "Les plugins permettent d'étendre les capacités d'Obsidian"
      weight: 2
---

# Mon Premier Quiz

Ce quiz teste les fonctionnalités de Quizzator.

## Lancer le quiz

Vous pouvez :
1. Cliquer sur l'icône Quizzator dans la barre latérale
2. Utiliser Ctrl+P → "Launch quiz from current file"
```

Sauvegardez cette note.

## Tester le plugin

### Test 1 : Sidebar

1. Cliquez sur l'icône 📋 (list-checks) dans la ribbon (barre latérale gauche)
2. Vous devriez voir votre quiz "Test Quiz Quizzator" listé
3. Cliquez dessus pour le lancer

### Test 2 : Commande

1. Ouvrez votre note de quiz
2. Appuyez sur Ctrl+P (Cmd+P sur Mac)
3. Tapez "Launch quiz"
4. Sélectionnez "Launch quiz from current file"

### Test 3 : Bouton inline

Ajoutez ceci dans n'importe quelle note :

````markdown
```quiz-button
path: nom-de-votre-quiz.md
```
````

Cliquez sur le bouton généré.

## Vérification des fonctionnalités

Quand le quiz se lance, vérifiez :

### ✓ Question True/False
- [ ] Deux boutons s'affichent (True/False)
- [ ] Le bouton sélectionné change de couleur
- [ ] Cliquer sur "Next" évalue instantanément
- [ ] Le score est 100 (correct) ou 0 (incorrect)

### ✓ Question MCQ Simple
- [ ] Les 4 options s'affichent avec des radio buttons
- [ ] Une seule option sélectionnable
- [ ] L'option sélectionnée est surlignée
- [ ] Score correct si bonne réponse

### ✓ Question Slider
- [ ] Un slider apparaît avec min/max
- [ ] La valeur s'affiche en temps réel
- [ ] Score 100 si dans la tolérance (±2 ans)

### ✓ Question MCQ Multiple
- [ ] Checkboxes au lieu de radio buttons
- [ ] Plusieurs options sélectionnables
- [ ] Score proportionnel (50% si 1/2 correct)

### ✓ Question Free Text
- [ ] Zone de texte pour réponse libre
- [ ] "Evaluating your answer..." s'affiche
- [ ] Le LLM retourne un score 0-100
- [ ] Explication fournie
- [ ] Réponse attendue affichée

### ✓ Résultats finaux
- [ ] Score total affiché (pondéré)
- [ ] Statut : ✓ Réussi / ~ Imprécis / ✗ Échoué
- [ ] Résumé de chaque question
- [ ] Poids de chaque question visible

### ✓ UI/UX
- [ ] Barre de progression fonctionne
- [ ] Design cohérent avec thème Obsidian
- [ ] Pas d'erreurs dans la console (F12)
- [ ] Transitions fluides entre questions

## Résolution de problèmes

### Le plugin n'apparaît pas
```bash
# Vérifiez que ces fichiers existent :
ls .obsidian/plugins/quizzator/
# Doit afficher : main.js, manifest.json, styles/
```

### Erreur LLM "Failed to connect"
- Vérifiez votre clé API dans Settings
- Pour OpenAI : clé commence par "sk-"
- Pour Anthropic : clé commence par "sk-ant-"
- Pour Ollama : vérifiez que le serveur tourne (`ollama serve`)

### Questions free-text ne marchent pas
- Un provider LLM doit être configuré
- Testez avec des questions sans free-text d'abord
- Vérifiez la console (F12) pour les erreurs

### Build ne marche pas
```bash
# Supprimez node_modules et réinstallez
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Debug Mode

Pour voir les logs détaillés :
1. Ouvrez la console (F12)
2. Regardez les messages du plugin
3. Toutes les erreurs apparaîtront ici

## Prochaines étapes

Une fois le test réussi :
- [ ] Créer vos propres quiz
- [ ] Tester avec différents LLM providers
- [ ] Ajuster les seuils de scoring
- [ ] Expérimenter avec les poids de questions
- [ ] Partager vos quiz !

## Feedback

Si vous rencontrez des bugs :
1. Notez l'erreur exacte
2. Regardez la console (F12)
3. Vérifiez la configuration

Bon test ! 🎯
