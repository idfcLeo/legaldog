// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, Timestamp, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    FIREBASE_API_KEY,
    AUTH_DOMAIN,
    PROJECT_ID,
    STORAGE_BUCKET,
    MESSAGING_SENDER_ID,
    APP_ID,
    MEASUREMENT_ID
} from "../config.js";

// --- App Configuration ---
const firebaseConfig = { apiKey: `${FIREBASE_API_KEY}`, authDomain: `${AUTH_DOMAIN}`, projectId: `${PROJECT_ID}`, storageBucket: `${STORAGE_BUCKET}`, messagingSenderId: `${MESSAGING_SENDER_ID}`, appId: `${APP_ID}`, measurementId: `${MEASUREMENT_ID}` };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'legaldoc-local-dev';

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global State ---
let unsubscribeHistory = null;
let currentDocumentText = '';
let currentLanguage = 'English';
let selectedDocumentType = 'Other';
const indianLanguages = ["Assamese", "Bengali", "Bodo", "Dogri", "English", "Gujarati", "Hindi", "Kannada", "Kashmiri", "Konkani", "Maithili", "Malayalam", "Manipuri", "Marathi", "Nepali", "Odia", "Punjabi", "Sanskrit", "Santali", "Sindhi", "Tamil", "Telugu", "Urdu"];

// --- DOM Cache ---
const dom = {
    appRoot: document.getElementById('app-root'),
    loadingScreen: document.getElementById('loadingScreen'),
    authBtn: document.getElementById('authBtn'),
    profileContainer: document.getElementById('profileContainer'),
    profileLinkBtn: document.getElementById('profileLinkBtn'),
    homeLink: document.getElementById('homeLink'),
    deleteModal: document.getElementById('deleteModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
};

const applyTheme = (theme) => {
  if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }

  // update toggle
  const indicator = document.getElementById("profileThemeIndicator");
  if (indicator) indicator.textContent = theme === "dark" ? "🌙" : "☀️";
};

const toggleTheme = () => {
  const newTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("theme", newTheme);
  applyTheme(newTheme);
};

// Force dark default if nothing saved
applyTheme(localStorage.getItem("theme") || "dark");



// --- Router and Page Loading ---
const loadPage = async (page) => {
    try {
        const response = await fetch(`pages/${page}.html`);
        if (!response.ok) throw new Error(`Page not found: ${page}.html`);
        dom.appRoot.innerHTML = await response.text();
        return true;
    } catch (error) {
        console.error("Error loading page:", error);
        dom.appRoot.innerHTML = `<p class="text-center text-red-500">Error loading page content.</p>`;
        return false;
    }
};

const setupPage = (pageId) => {
    switch (pageId) {
        case 'home':
            document.getElementById('getStartedBtn')?.addEventListener('click', () => router('signup'));
            break;
        case 'signin':
            document.getElementById('signInForm')?.addEventListener('submit', handleSignIn);
            document.getElementById('googleSignInBtnSignIn')?.addEventListener('click', handleGoogleSignIn);
            document.getElementById('goToSignUpBtn')?.addEventListener('click', () => router('signup'));
            document.getElementById('backToHomeFromSignIn')?.addEventListener('click', () => router('home'));
            break;
        case 'signup':
            document.getElementById('signUpForm')?.addEventListener('submit', handleSignUp);
            document.getElementById('goToSignInBtn')?.addEventListener('click', () => router('signin'));
            document.getElementById('backToHomeFromSignUp')?.addEventListener('click', () => router('home'));
            document.getElementById('googleSignInBtnSignUp')?.addEventListener('click', handleGoogleSignIn);
            break;
        case 'dashboard':
            document.querySelectorAll('.use-case-card').forEach(card => {
                card.addEventListener('click', () => {
                    selectedDocumentType = card.dataset.type;
                    document.getElementById('fileInput').click();
                });
            });
            document.getElementById('fileInput')?.addEventListener('change', handleFileUpload);
            break;
        case 'profile':
            document.getElementById('profileUserEmail').textContent = auth.currentUser?.email || 'N/A';
            const themeIndicator = document.getElementById('profileThemeIndicator');
            themeIndicator.textContent = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
            document.getElementById('profileThemeToggleBtn').addEventListener('click', toggleTheme);
            document.getElementById('profileLogoutBtn').addEventListener('click', () => signOut(auth));
            document.getElementById('profileHistoryBtn').addEventListener('click', () => router('history'));
            document.getElementById('profileDeleteAccountBtn').addEventListener('click', () => dom.deleteModal.classList.remove('hidden'));
            document.getElementById('backToDashboardFromProfileBtn').addEventListener('click', () => router('dashboard'));
            break;
        case 'history':
             fetchHistory(auth.currentUser.uid);
             document.getElementById('backToDashboardFromHistoryBtn')?.addEventListener('click', () => router('dashboard'));
            break;
        case 'analysis':
            document.getElementById('backToDashboardBtn')?.addEventListener('click', () => router('dashboard'));
            break;
    }
};

const router = async (page) => {
    await loadPage(page);
    setupPage(page);
};

// --- Authentication Logic ---
onAuthStateChanged(auth, user => {
    dom.loadingScreen.classList.add('hidden');
    if (unsubscribeHistory) unsubscribeHistory();
    if (user) {
        dom.authBtn.classList.add('hidden');
        dom.profileContainer.classList.remove('hidden');
        const currentPage = dom.appRoot.querySelector('main')?.id || '';
        if(['signInPage', 'signUpPage', 'publicPage', ''].includes(currentPage)) {
            router('dashboard');
        }
    } else {
        dom.authBtn.classList.remove('hidden');
        dom.profileContainer.classList.add('hidden');
        router('home');
    }
});

// Event listeners for static elements
dom.homeLink.addEventListener('click', (e) => { e.preventDefault(); router(auth.currentUser ? 'dashboard' : 'home'); });
dom.profileLinkBtn.addEventListener('click', () => router('profile'));
dom.authBtn.addEventListener('click', () => router('signin'));
dom.cancelDeleteBtn.addEventListener('click', () => dom.deleteModal.classList.add('hidden'));
dom.confirmDeleteBtn.addEventListener('click', handleDeleteAccount);

const handleSignIn = async (e) => { e.preventDefault(); try { await setPersistence(auth, browserSessionPersistence); await signInWithEmailAndPassword(auth, e.target.signInEmail.value, e.target.signInPassword.value); } catch (err) { document.getElementById('signInAuthError').textContent = err.message; } };
const handleSignUp = async (e) => { e.preventDefault(); try { await setPersistence(auth, browserSessionPersistence); await createUserWithEmailAndPassword(auth, e.target.signUpEmail.value, e.target.signUpPassword.value); } catch (err) { document.getElementById('signUpAuthError').textContent = err.message; } };
const handleGoogleSignIn = async () => { try { await setPersistence(auth, browserSessionPersistence); await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { console.error(err); } };

async function handleDeleteAccount() {
    const user = auth.currentUser;
    if (!user) return;
    dom.confirmDeleteBtn.textContent = "Deleting...";
    dom.confirmDeleteBtn.disabled = true;
    try {
        const historyCollectionPath = `/artifacts/${appId}/users/${user.uid}/documents`;
        const snapshot = await getDocs(query(collection(db, historyCollectionPath)));
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await deleteUser(user);
        dom.deleteModal.classList.add('hidden');
    } catch (error) {
        console.error("Error deleting account:", error);
        alert("Error deleting account. Please sign in again.");
    } finally {
        dom.confirmDeleteBtn.textContent = "Delete Account";
        dom.confirmDeleteBtn.disabled = false;
    }
}

// --- Core App Logic ---
function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    router('analysis').then(() => {
        const analysisLoading = document.getElementById('analysisLoading');
        analysisLoading.classList.remove('hidden');
        document.getElementById('analysisContent').innerHTML = '';
        
        const fileName = file.name;
        const fileType = fileName.split('.').pop().toLowerCase();

        const proceedWithAnalysis = async (name, text) => {
            currentDocumentText = text;
            const analysisResult = await analyzeDocument(currentDocumentText, selectedDocumentType);
            
            analysisLoading.classList.add('hidden');
            displayAnalysis(name, analysisResult);
            
            if (analysisResult) {
                await saveAnalysisToHistory(name, analysisResult, currentDocumentText);
            }
        };
        
        if (fileType === 'txt') {
            const reader = new FileReader();
            reader.onload = (e) => proceedWithAnalysis(fileName, e.target.result);
            reader.readAsText(file);
        } else if (['pdf', 'doc', 'docx'].includes(fileType)) {
            const simulatedText = `(Simulated text extraction for ${fileName})\n\nThis document outlines the terms and conditions for a software license agreement. Key clauses include limitations of liability, which cap damages at the amount paid for the license, and a binding arbitration clause for all disputes, waiving the right to a court trial. The agreement also states the licensor may enter premises without prior notice for audit purposes.`;
            proceedWithAnalysis(fileName, simulatedText);
        } else {
            alert("Unsupported file type.");
            router('dashboard');
        }
        event.target.value = '';
    });
}

// const getSystemPrompt = (docType, docText) => {
//     let persona = "a person";
//     let focus = "general legal and financial risks";
//     let summaryPersona = "a general user";

//     switch(docType) {
//         case "Rental Agreement": persona = "a tenant in Amaravati, Andhra Pradesh"; focus = "risks related to security deposits, rent increases, maintenance responsibilities, and termination clauses under local tenancy norms"; summaryPersona = "a tenant"; break;
//         case "Bank Loan": persona = "a borrower taking a personal loan"; focus = "hidden fees, interest rate clauses (especially floating rates), prepayment penalties, and collateral requirements"; summaryPersona = "a loan applicant"; break;
//         case "Employment Contract": persona = "an employee joining a new company"; focus = "non-compete clauses, intellectual property rights, termination conditions, and salary components"; summaryPersona = "a new employee"; break;
//         case "College Admission": persona = "a student accepting a college admission or scholarship"; focus = "binding commitments, scholarship conditions (like maintaining a certain GPA), withdrawal policies, and fee payment schedules"; summaryPersona = "a student"; break;
//         case "Startup Funding": persona = "a startup founder receiving an investment"; focus = "clauses related to equity dilution, liquidation preferences, board seats, and shareholder rights"; summaryPersona = "a startup founder"; break;
//         case "Insurance Policy": persona = "a policyholder"; focus = "coverage limits, exclusions, claim procedures, and premium details"; summaryPersona = "a policyholder"; break;
//         case "Terms of Service": persona = "a user signing up for an online service"; focus = "data privacy policies, content ownership, termination of service clauses, and liability limitations"; summaryPersona = "a user"; break;
//     }

//     return `You are an AI legal advisor specializing in Indian law. The user is ${persona} reviewing a ${docType}. 
//     Analyze the document from their perspective, focusing on ${focus}.
    
//     Your JSON output must follow this exact schema:
//     {
//       "summaries": { "summary": "A simple, one-sentence summary for ${summaryPersona}." },
//       "risks": [{"level": "high" | "attention", "clause": "The exact text of the risky clause.", "explanation": "A simple, one-sentence explanation of the risk."}],
//       "checklist": ["A short, actionable to-do item for the user.", "Another key point to verify before signing."]
//     }

//     Analyze the following document:
//     ---
//     ${docText}`;
// };

const getSystemPrompt = (docType, docText) => {
  let persona = "a general reader";
  let focus = "general legal and financial risks";
  let summaryPersona = "a general user";

  switch(docType) {
    case "Rental Agreement":
      persona = "a tenant in Amaravati, Andhra Pradesh";
      focus = "risks related to deposits, rent hikes, maintenance duties, and termination rules under Indian tenancy law";
      summaryPersona = "a tenant";
      break;
    case "Bank Loan":
      persona = "a borrower taking a personal loan";
      focus = "hidden fees, floating interest clauses, foreclosure penalties, collateral seizure";
      summaryPersona = "a loan applicant";
      break;
    case "Employment Contract":
      persona = "an employee joining a new company";
      focus = "non-compete clauses, intellectual property ownership, termination conditions, salary and benefits clarity";
      summaryPersona = "a new employee";
      break;
    case "College Admission":
      persona = "a student accepting a college admission/scholarship";
      focus = "refund/withdrawal terms, academic performance requirements, hidden fee structures, penalties";
      summaryPersona = "a student";
      break;
    case "Startup Funding":
      persona = "a startup founder raising money";
      focus = "equity dilution, liquidation preference, voting rights, investor control terms";
      summaryPersona = "a founder";
      break;
    case "Insurance Policy":
      persona = "a policyholder";
      focus = "coverage limits, exclusions, claim procedures, premium obligations";
      summaryPersona = "a policyholder";
      break;
    case "Terms of Service":
      persona = "an internet user";
      focus = "data privacy, content ownership, liability disclaimers, account suspension rules";
      summaryPersona = "a user";
      break;
  }

  return `
You are an **AI Legal Assistant** specializing in **Indian law and common contract practices**.  
The user is **${persona}** reviewing a **${docType}**.  
Your task: First: to analyze that if the document is correct, legal, in alignment to the doctype provided, and then analyze the document text from their perspective, focusing on **${focus}**.   

### Output Requirements:
- **Plain language only** (avoid legal jargon unless quoting).  
- Always **directly quote risky clauses** from the document.  
- Give **short, clear explanations** of risks (like advice to a layperson).  
- Classify risks as:  
  - **high** = serious risk, could harm rights or cause major loss.  
  - **attention** = not immediately dangerous, but needs awareness/clarity.  

### JSON Response Schema:
{
  "summaries": { "summary": "One-sentence summary for ${summaryPersona}." },
  "risks": [
    {
      "level": "high" | "attention",
      "clause": "Exact risky clause from the document",
      "explanation": "Simple explanation of why it matters"
    }
  ],
  "checklist": [
    "Action item 1 for the user",
    "Action item 2 (practical next step)"
  ]
}

### Document to analyze:
---
${docText}
---
`;
};


async function analyzeDocument(documentText, documentType) {
    const systemPrompt = getSystemPrompt(documentType, documentText);
    const payload = { 
        contents: [{ parts: [{ text: systemPrompt }] }], 
        generationConfig: { responseMimeType: "application/json" } 
    };

    try {
        const response = await fetch("/api/gemini", {  // ✅ backend proxy
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
        const result = await response.json();
        return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (error) { console.error("Gemini API call failed:", error); return null; }
}

function displayAnalysis(fileName, analysisData) {
    document.getElementById('analysisTitle').textContent = `Analysis for: ${fileName}`;
    const contentContainer = document.getElementById('analysisContent');
    contentContainer.innerHTML = '';

    if (!analysisData) {
        contentContainer.innerHTML = `
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
            <h2 class="text-2xl font-bold text-red-500 mb-4">Analysis Failed</h2>
            <p>Could not analyze document.</p>
          </div>`;
        return;
    }

    // --- Key Summary ---
    const summariesHTML = `
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h2 class="text-2xl font-bold text-sky-500 mb-4">Key Summary</h2>
        <div class="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg">
          <p>${analysisData.summaries?.summary || "N/A"}</p>
        </div>
      </div>`;

    // --- Clause Risks ---
    let risksHTML = '';
    if (analysisData.risks && analysisData.risks.length > 0) {
        const riskItems = analysisData.risks.map(risk => `
          <div class="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <p class="text-slate-700 dark:text-slate-300">
              "<span class="${risk.level === 'high' ? 'highlight-high' : 'highlight-attention'}">${risk.clause}</span>"
            </p>
            <p class="text-sm mt-2"><strong>Reason:</strong> ${risk.explanation}</p>
          </div>`).join('');
        risksHTML = `
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 class="text-2xl font-bold text-sky-500 mb-4">Clause Risk Scoring</h2>
            <div class="space-y-4">${riskItems}</div>
          </div>`;
    } else {
        risksHTML = `
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 class="text-2xl font-bold text-sky-500 mb-4">Clause Risk Scoring</h2>
            <div class="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 text-center">
              <p class="text-green-600 dark:text-green-400 font-semibold">No significant risks were found.</p>
            </div>
          </div>`;
    }

    // --- Checklist ---
    let checklistHTML = '';
    if (analysisData.checklist && analysisData.checklist.length > 0) {
        const checklistItems = analysisData.checklist.map((item, index) => {
            const itemId = `checklist-${fileName}-${index}`;
            return `
              <li class="flex items-center gap-3">
                <input type="checkbox" id="${itemId}" data-key="${itemId}"
                  class="form-checkbox h-5 w-5 text-sky-500 rounded focus:ring-sky-400 dark:focus:ring-sky-600">
                <label for="${itemId}" class="text-slate-700 dark:text-slate-300">${item}</label>
              </li>`;
        }).join('');

        checklistHTML = `
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 class="text-2xl font-bold text-sky-500 mb-4">Smart Checklist</h2>
            <ul class="space-y-3">${checklistItems}</ul>
          </div>`;
    }

    // --- Interactive Q&A ---
    const chatHTML = `
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-sky-500">Interactive Q&A</h2>
          <div class="relative">
            <button id="languageSelectBtn" type="button" 
              class="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>English</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div id="languageDropdown" class="hidden absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-10 border">
              <div class="p-2">
                <input type="text" id="languageSearchInput" placeholder="Search..." 
                  class="w-full bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md p-2 text-sm">
              </div>
              <ul id="languageList" class="max-h-48 overflow-y-auto"></ul>
            </div>
          </div>
        </div>
        <div id="chatMessages" class="h-64 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-900 rounded-lg mb-4 space-y-4 flex flex-col"></div>
        <form id="chatForm" class="flex items-center gap-4">
          <input type="text" id="chatInput" placeholder="Ask a question..." 
            class="flex-grow bg-slate-200 dark:bg-slate-700 rounded-lg p-3" required>
          <button type="submit" 
            class="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-5 rounded-lg">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.27 3.13A59.77 59.77 0 0121.48 12 59.77 59.77 0 013.27 20.88L6 12zm0 0h7.5"/>
            </svg>
          </button>
        </form>
      </div>`;

    contentContainer.innerHTML = summariesHTML + risksHTML + checklistHTML + chatHTML;

    // --- Checklist persistence (restore + save) ---
    const checklistInputs = document.querySelectorAll("#analysisContent input[type='checkbox']");
    checklistInputs.forEach(input => {
        const key = input.dataset.key;
        if (localStorage.getItem(key) === "true") {
            input.checked = true;
        }
        input.addEventListener("change", () => {
            localStorage.setItem(key, input.checked);
        });
    });

    // Q&A setup (unchanged)
    const langBtn = document.getElementById('languageSelectBtn');
    const langDropdown = document.getElementById('languageDropdown');
    const langSearch = document.getElementById('languageSearchInput');
    const langList = document.getElementById('languageList');
    const populateLangs = (filter = '') => {
        langList.innerHTML = '';
        indianLanguages.filter(lang => lang.toLowerCase().includes(filter.toLowerCase())).forEach(lang => {
            const li = document.createElement('li');
            li.textContent = lang;
            li.className = 'px-4 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700';
            li.onclick = () => { currentLanguage = lang; langBtn.querySelector('span').textContent = lang; langDropdown.classList.add('hidden'); };
            langList.appendChild(li);
        });
    };
    populateLangs();
    langBtn.addEventListener('click', (e) => { e.stopPropagation(); langDropdown.classList.toggle('hidden'); });
    langSearch.addEventListener('input', () => populateLangs(langSearch.value));
    document.addEventListener('click', (e) => { if (langDropdown && !langBtn.contains(e.target)) langDropdown.classList.add('hidden'); });
    document.getElementById('chatForm').addEventListener('submit', handleChatSubmit);
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const chatInput = document.getElementById('chatInput');
    const userQuestion = chatInput.value.trim();
    if (!userQuestion || !currentDocumentText) return;
    const chatMessages = document.getElementById('chatMessages');
    const userBubble = document.createElement('div');
    userBubble.className = 'p-3 self-end chat-bubble-user';
    userBubble.textContent = userQuestion;
    chatMessages.appendChild(userBubble);
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'p-3 self-start chat-bubble-ai flex items-center';
    loadingBubble.innerHTML = `<div class="loader !w-5 !h-5 !border-2"></div>`;
    chatMessages.appendChild(loadingBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    const aiResponse = await askQuestion(userQuestion);
    loadingBubble.remove();
    const aiBubble = document.createElement('div');
    aiBubble.className = 'p-3 self-start chat-bubble-ai';
    aiBubble.textContent = aiResponse;
    chatMessages.appendChild(aiBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function askQuestion(question) {
    const systemPrompt = `You are an AI legal advisor. A user has provided a legal document and is asking a question. Answer based *only* on the document context. If the answer is not in the document, say so. **Always respond in ${currentLanguage}.** DOCUMENT CONTEXT: --- ${currentDocumentText} --- USER QUESTION: "${question}"`;
    const payload = { contents: [{ parts: [{ text: systemPrompt }] }] };

    try {
        const response = await fetch("/api/gemini", {   // ✅ backend proxy
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('API response was not ok.');
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
    } catch (error) { console.error("Gemini Q&A call failed:", error); return "Sorry, there was an error."; }
}

async function saveAnalysisToHistory(fileName, analysisResult, originalText) {
    const user = auth.currentUser;
    if (!user) return;
    const historyCollectionPath = `/artifacts/${appId}/users/${user.uid}/documents`;
    await addDoc(collection(db, historyCollectionPath), {
        fileName: fileName,
        analyzedAt: Timestamp.now(),
        analysis: JSON.stringify(analysisResult),
        originalText: originalText
    });
}

function fetchHistory(userId) {
    const historyCollectionPath = `/artifacts/${appId}/users/${userId}/documents`;
    const q = query(collection(db, historyCollectionPath));
    
    unsubscribeHistory = onSnapshot(q, (querySnapshot) => {
        const container = document.getElementById('historyContainer');
        const placeholder = document.getElementById('historyPlaceholder');
        if (!container || !placeholder) return;

        if (querySnapshot.empty) {
            container.innerHTML = '';
            container.appendChild(placeholder);
            placeholder.classList.remove('hidden');
        } else {
            placeholder.classList.add('hidden');
            container.innerHTML = '';
            const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            docs.sort((a, b) => b.analyzedAt.toMillis() - a.analyzedAt.toMillis());

            docs.forEach(docData => {
                const date = docData.analyzedAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                const item = document.createElement('div');
                item.className = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-center';
                item.innerHTML = `
                    <div>
                        <p class="font-semibold text-slate-900 dark:text-white">${docData.fileName}</p>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Analyzed on: ${date}</p>
                    </div>
                    <button class="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2 px-4 rounded-md">View Report</button>
                `;
                item.querySelector('button').onclick = () => {
                    const analysisResult = JSON.parse(docData.analysis);
                    currentDocumentText = docData.originalText || '';
                    router('analysis').then(() => displayAnalysis(docData.fileName, analysisResult));
                };
                container.appendChild(item);
            });
        }
    }, (error) => {
        console.error("Firebase permission error:", error.message);
        const container = document.getElementById('historyContainer');
        if(container) container.innerHTML = `<p class="text-red-500 text-center">Could not load history. Check Firestore rules.</p>`;
    });
}
