# LegalDoc: AI-Powered Legal Document Analyzer  

<p align="center">
  <em>An intelligent web application to demystify complex legal documents using Generative AI.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B9?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

---

## 1. Objective  
LegalDoc is an intelligent web application designed to demystify complex legal documents.  
It transforms dense legal jargon into **clear summaries, actionable checklists, and risk assessments**.  

By leveraging Google's Gemini AI, the app empowers individuals to make informed decisions and understand their legal commitments in a private, safe, and supportive environment.  

This project addresses the critical information asymmetry in legal agreements, helping users protect themselves from potential legal and financial risks.  

---

## 2. Key Features  

**Feature** | **Description**  
--- | ---  
**Use-Case Analysis** | Select a document type (e.g., Rental Agreement, Employment Contract) for a highly tailored analysis.  
**AI Summaries** | Get simple, one-sentence summaries of the document's core purpose.  
**Risk Scoring** | Automatically flags potentially risky clauses, categorized by severity (*High Risk*, *Needs Attention*).  
**Smart Checklists** | Generates a dynamic to-do list of key actions for the user to verify before signing.  
**Interactive Q&A** | Chat interface to ask follow-up questions about the document in natural language.  
**Multilingual Support** | Supports a wide range of Indian languages, making it accessible to a broader audience.  
**Secure Accounts** | Full user authentication system with Email/Password and Google sign-in options.  
**Document History** | Securely saves all past analyses to a user's profile for review at any time.  
**Profile Management** | Dedicated page with theme preferences (light/dark mode), logout, and secure account deletion.  

---

## 3. Tech Stack  

- **Front-End:** HTML5, CSS3, JavaScript (ES Modules)  
- **Styling:** Tailwind CSS  
- **Backend Services:**  
  - Google Gemini API: For all generative AI tasks  
  - Firebase Authentication: For user management  
  - Firestore: For storing user profiles and document history  

---

## 4. Project Structure  


├── index.html // Main application shell

├── css/style.css // All custom styles

└── js/main.js // Core application logic

└── pages/

├── home.html // Landing page

├── signin.html // Sign-in form

├── signup.html // Sign-up form

├── dashboard.html // Document type selection

├── history.html // Document history view

├── profile.html // User profile and settings

└── analysis.html // Analysis report view


---

## 5. Local Setup and Installation  

To run this project on your local machine, follow these steps:  

### Prerequisites  
- A modern web browser (Chrome, Firefox)  
- A code editor (e.g., Visual Studio Code)  
- The **Live Server** extension for VS Code  

### Configuration Steps  

**Step 1: Firebase Project Setup**  
1. Go to the Firebase Console and create a new project.  
2. Add a new Web App and copy the `firebaseConfig` object.  
3. Enable Email/Password and Google providers in the **Authentication > Sign-in method** tab.  
4. Create a Firestore Database in Production mode.  

**Step 2: Google Gemini API Key**  
- Go to [Google AI Studio](https://aistudio.google.com) and create/copy your API key.  

**Step 3: Configure the Application**  
- Open the `js/main.js` file.  
- Paste your Firebase and Gemini credentials into the placeholder constants:  

```javascript
// js/main.js
const firebaseConfig = { /* PASTE YOUR FIREBASE CONFIG HERE */ };
const apiKey = "PASTE_YOUR_GEMINI_API_KEY_HERE";
```
Step 4: Set Firestore Security Rules

In your Firebase project, go to Firestore Database > Rules and replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click Publish.

Step 5: Run the Application
1. Open the project folder in VS Code.
2. Right-click index.html → Open with Live Server.

