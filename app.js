import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* =========================================================
   Firebase
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDSE4JV1QTre_pntwdml0S2oCSCnU0wlK0",
  authDomain: "book-writing-7019c.firebaseapp.com",
  projectId: "book-writing-7019c",
  storageBucket: "book-writing-7019c.firebasestorage.app",
  messagingSenderId: "952056354183",
  appId: "1:952056354183:web:d74cd413322cc61d2daf22"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


/* =========================================================
   전역 변수
========================================================= */

let currentUserId = null;
let books = [];
let currentBook = null;
let currentChapter = 0;
let saveTimer = null;
let savedRange = null;
let lastVersionSnapshot = "";
let lastVersionAt = 0;


/* =========================================================
   로그인 상태
========================================================= */

function getCurrentUserId() {
  return currentUserId || "";
}


function setLogin(id) {
  currentUserId = id;

  localStorage.setItem(
    "bookWritingUser",
    id
  );
}


function clearLogin() {
  currentUserId = null;

  localStorage.removeItem(
    "bookWritingUser"
  );
}


/* =========================================================
   공통
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function showError(message) {

  const old =
    document.querySelector(
      ".error-message"
    );

  if (old) {
    old.remove();
  }


  const box =
    document.createElement("div");

  box.className =
    "error-message";

  box.textContent =
    message;


  document.body.appendChild(box);


  setTimeout(() => {

    if (box.parentNode) {
      box.remove();
    }

  }, 5000);
}


function errorMessage(error) {

  console.error(error);

  if (
    error?.code ===
    "permission-denied"
  ) {
    return "Firestore 권한이 없습니다. Firestore 보안 규칙을 확인하세요.";
  }

  if (
    error?.code ===
    "failed-precondition"
  ) {
    return "Firestore 설정에 문제가 있습니다.";
  }

  if (
    error?.code ===
    "unavailable"
  ) {
    return "Firebase 서버에 연결할 수 없습니다.";
  }

  return (
    error?.message ||
    "알 수 없는 오류가 발생했습니다."
  );
}


/* =========================================================
   로그인 화면
========================================================= */

function authScreen() {

  document.body.innerHTML = `

    <div class="auth-container">

      <div class="auth-box">

        <h1>Book Writing</h1>


        <div class="auth-tabs">

          <button
            id="loginTab"
            class="active"
          >
            로그인
          </button>

          <button
            id="signupTab"
          >
            회원가입
          </button>

        </div>


        <!-- 로그인 -->

        <div id="loginForm">

          <input
            id="loginId"
            type="text"
            placeholder="아이디"
            autocomplete="username"
          >

          <input
            id="loginPassword"
            type="password"
            placeholder="비밀번호"
            autocomplete="current-password"
          >

          <button id="loginButton">
            로그인
          </button>

        </div>


        <!-- 회원가입 -->

        <div
          id="signupForm"
          style="display:none;"
        >

          <input
            id="signupId"
            type="text"
            placeholder="아이디"
            autocomplete="username"
          >

          <input
            id="signupPassword"
            type="password"
            placeholder="비밀번호"
            autocomplete="new-password"
          >

          <input
            id="signupPassword2"
            type="password"
            placeholder="비밀번호 확인"
            autocomplete="new-password"
          >

          <button id="signupButton">
            회원가입
          </button>

        </div>

      </div>

    </div>
  `;


  const loginTab =
    document.getElementById(
      "loginTab"
    );

  const signupTab =
    document.getElementById(
      "signupTab"
    );

  const loginForm =
    document.getElementById(
      "loginForm"
    );

  const signupForm =
    document.getElementById(
      "signupForm"
    );


  loginTab.onclick = () => {

    loginTab.classList.add(
      "active"
    );

    signupTab.classList.remove(
      "active"
    );

    loginForm.style.display =
      "";

    signupForm.style.display =
      "none";
  };


  signupTab.onclick = () => {

    signupTab.classList.add(
      "active"
    );

    loginTab.classList.remove(
      "active"
    );

    signupForm.style.display =
      "";

    loginForm.style.display =
      "none";
  };


  document.getElementById(
    "loginButton"
  ).onclick = login;


  document.getElementById(
    "signupButton"
  ).onclick = signup;


  /*
    Enter 키로 로그인
  */

  document.getElementById(
    "loginPassword"
  ).addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {
        login();
      }

    }
  );


  /*
    Enter 키로 회원가입
  */

  document.getElementById(
    "signupPassword2"
  ).addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {
        signup();
      }

    }
  );
}


/* =========================================================
   회원가입
========================================================= */

async function signup() {

  const userId =
    document.getElementById(
      "signupId"
    );

  const password =
    document.getElementById(
      "signupPassword"
    );

  const password2 =
    document.getElementById(
      "signupPassword2"
    );


  const id =
    userId.value
      .trim()
      .toLowerCase();

  const pw =
    password.value;

  const pw2 =
    password2.value;


  if (!id) {

    showError(
      "아이디를 입력하세요."
    );

    return;
  }


  if (
    !/^[a-zA-Z0-9가-힣_-]+$/.test(id)
  ) {

    showError(
      "아이디에는 영문, 숫자, 한글, _, -만 사용할 수 있습니다."
    );

    return;
  }


  if (!pw) {

    showError(
      "비밀번호를 입력하세요."
    );

    return;
  }


  if (pw.length < 1) {

    showError(
      "비밀번호를 입력하세요."
    );

    return;
  }


  if (pw !== pw2) {

    showError(
      "비밀번호가 서로 다릅니다."
    );

    return;
  }


  try {

    /*
      users/{ID} 문서 확인
    */

    const userRef =
      doc(
        db,
        "users",
        id
      );


    const userSnapshot =
      await getDoc(
        userRef
      );


    if (userSnapshot.exists()) {

      showError(
        "이미 존재하는 아이디입니다."
      );

      return;
    }


    /*
      users/{ID}

      ID
      PASSWORD
      createdAt
    */

    await setDoc(
      userRef,
      {
        ID: id,
        PASSWORD: pw,
        createdAt:
          serverTimestamp()
      }
    );


    alert(
      "회원가입이 완료되었습니다."
    );


    /*
      로그인 화면으로 전환
    */

    document.getElementById(
      "loginTab"
    ).click();


    document.getElementById(
      "loginId"
    ).value = id;


    document.getElementById(
      "loginPassword"
    ).value = "";


  } catch (error) {

    showError(
      "회원가입 실패: " +
      errorMessage(error)
    );
  }
}


/* =========================================================
   로그인
========================================================= */

async function login() {

  const userId =
    document.getElementById(
      "loginId"
    );

  const password =
    document.getElementById(
      "loginPassword"
    );


  const id =
    userId.value
      .trim()
      .toLowerCase();

  const pw =
    password.value;


  if (!id) {

    showError(
      "아이디를 입력하세요."
    );

    return;
  }


  if (!pw) {

    showError(
      "비밀번호를 입력하세요."
    );

    return;
  }


  try {

    /*
      users/{ID}
    */

    const userRef =
      doc(
        db,
        "users",
        id
      );


    const snapshot =
      await getDoc(
        userRef
      );


    if (!snapshot.exists()) {

      showError(
        "존재하지 않는 아이디입니다."
      );

      return;
    }


    const data =
      snapshot.data();


    /*
      Firestore의 PASSWORD와
      입력한 비밀번호 비교
    */

    if (
      String(data.PASSWORD ?? "") !==
      String(pw)
    ) {

      showError(
        "비밀번호가 올바르지 않습니다."
      );

      return;
    }


    /*
      로그인 성공
    */

    setLogin(id);


    dashboard();


  } catch (error) {

    showError(
      "로그인 실패: " +
      errorMessage(error)
    );
  }
}


/* =========================================================
   로그아웃
========================================================= */

function logout() {

  clearLogin();

  currentBook = null;
  books = [];


  authScreen();
}


/* =========================================================
   책 HTML → 텍스트
========================================================= */

function htmlToBookText(html) {

  const div =
    document.createElement(
      "div"
    );

  div.innerHTML =
    html || "";


  const text =
    div.innerText ||
    div.textContent ||
    "";


  return text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/* =========================================================
   책 상세
========================================================= */

function bookDetail(book) {

  if (!book) {
    return "";
  }


  const chapters =
    Array.isArray(
      book.chapters
    )
      ? book.chapters
      : [];


  return chapters
    .map(
      (chapter, index) => {

        const title =
          chapter.title ||
          `제${index + 1}장`;


        const content =
          htmlToBookText(
            chapter.content ||
            ""
          );


        return (
          `[CHAPTER ${index + 1}] ${title}\n` +
          content
        );

      }
    )
    .join("\n\n");
}


/* =========================================================
   책 불러오기
========================================================= */

async function loadBooks() {

  const writer =
    getCurrentUserId();


  if (!writer) {

    books = [];

    return;
  }


  try {

    /*
      현재 로그인한 사용자의 책만
      가져온다.
    */

    const booksQuery =
      query(
        collection(
          db,
          "books"
        ),
        where(
          "WRITER",
          "==",
          writer
        )
      );


    const snapshot =
      await getDocs(
        booksQuery
      );


    books =
      snapshot.docs
        .map(
          item => ({
            ...item.data(),
            id: item.id
          })
        )
        .sort(
          (a, b) =>
            (b.updatedMillis || 0) -
            (a.updatedMillis || 0)
        );


    /*
      기존 책에 chapters가 없다면
      기본 장을 만들어준다.
    */

    books =
      books.map(
        book => {

          if (
            !Array.isArray(
              book.chapters
            )
          ) {

            book.chapters = [

              {
                title: "제1장",
                content: ""
              }

            ];
          }


          return book;
        }
      );


  } catch (error) {

    showError(
      "책을 불러오지 못했습니다: " +
      errorMessage(error)
    );
  }
}


/* =========================================================
   책 저장
========================================================= */

async function saveBook(book) {

  if (!book) return;

  const writer = getCurrentUserId();
  if (!writer) return;

  // 문서 ID는 책 제목이 아니라 생성 시 발급한 고유 ID를 사용한다.
  // 따라서 제목을 바꿔도 같은 Firestore 문서에 계속 저장된다.
  if (!book.id) {
    book.id =
      (crypto.randomUUID ? crypto.randomUUID() : `book-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  const title =
    (book.title || "제목 없는 책").trim() || "제목 없는 책";

  const detail = bookDetail(book);

  await setDoc(
    doc(db, "books", book.id),
    {
      WRITER: writer,
      DITAIL: detail,
      title,
      chapters: Array.isArray(book.chapters) ? book.chapters : [],
      updatedMillis: book.updatedMillis || Date.now(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  book.title = title;
  book.WRITER = writer;
  book.DITAIL = detail;
}


/* =========================================================
   추가 기능: 통계 / 버전 / 검색 / 내보내기
========================================================= */

function getBookStats(book) {
  const chapters = Array.isArray(book?.chapters) ? book.chapters : [];
  let all = "";
  let current = "";
  chapters.forEach((chapter, index) => {
    const text = htmlToBookText(chapter?.content || "");
    all += text + "\n";
    if (index === currentChapter) current = text;
  });
  const count = text => ({
    withSpaces: text.length,
    withoutSpaces: text.replace(/\s/g, "").length,
    sentences: (text.match(/[.!?。！？]+/g) || []).length
  });
  return { current: count(current), total: count(all.trim()) };
}

function updateStats() {
  const box = document.getElementById("editorStats");
  if (!box || !currentBook) return;
  const s = getBookStats(currentBook);
  box.innerHTML =
    "<span>현재 장 <b>" + s.current.withoutSpaces.toLocaleString() + "</b>자</span>" +
    "<span>전체 <b>" + s.total.withoutSpaces.toLocaleString() + "</b>자</span>" +
    "<span>공백 포함 " + s.total.withSpaces.toLocaleString() + "</span>" +
    "<span>문장 " + s.total.sentences.toLocaleString() + "</span>";
}

async function createVersionSnapshot(book) {
  if (!book?.id) return;
  const snapshot = JSON.stringify({title:book.title || "", chapters:book.chapters || []});
  const now = Date.now();
  if (snapshot === lastVersionSnapshot || now - lastVersionAt < 30000) return;
  try {
    await setDoc(doc(db, "books", book.id, "versions", String(now)), {
      title: book.title || "제목 없는 책",
      chapters: book.chapters || [],
      savedMillis: now,
      savedAt: serverTimestamp()
    });
    lastVersionSnapshot = snapshot;
    lastVersionAt = now;
  } catch (error) {
    console.warn("버전 기록 실패:", error);
  }
}

async function showVersionHistory() {
  if (!currentBook?.id) return;
  try {
    const snapshot = await getDocs(collection(db, "books", currentBook.id, "versions"));
    const versions = snapshot.docs.map(item => ({id:item.id, ...item.data()}))
      .sort((a,b) => Number(b.savedMillis || b.id) - Number(a.savedMillis || a.id))
      .slice(0,30);

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML =
      '<div class="modal-card history-modal">' +
      '<div class="modal-head"><div><p class="eyebrow">HISTORY</p><h3>버전 기록</h3></div><button class="modal-close">×</button></div>' +
      '<div class="history-list">' +
      (versions.length ? versions.map((v,i) => {
        const date = new Date(Number(v.savedMillis || v.id));
        const chars = getBookStats({chapters:v.chapters}).total.withoutSpaces;
        return '<div class="history-item"><div><strong>' + escapeHtml(v.title || "제목 없는 책") +
          '</strong><span>' + date.toLocaleString("ko-KR") + ' · ' + (v.chapters?.length || 0) +
          '개 장 · ' + chars.toLocaleString() + '자</span></div><button class="restore-version-button" data-index="' + i + '">복구</button></div>';
      }).join("") : '<div class="history-empty">아직 저장된 버전이 없습니다.</div>') +
      '</div></div>';

    document.body.appendChild(modal);
    modal.querySelector(".modal-close").onclick = () => modal.remove();

    modal.querySelectorAll(".restore-version-button").forEach(button => {
      button.onclick = async () => {
        const version = versions[Number(button.dataset.index)];
        if (!version || !confirm("이 버전으로 복구할까요? 현재 내용은 먼저 저장됩니다.")) return;
        updateCurrentChapter();
        await saveBook(currentBook);
        currentBook.title = version.title || currentBook.title;
        currentBook.chapters = JSON.parse(JSON.stringify(version.chapters || []));
        currentChapter = 0;
        renderEditorContent();
        updateStats();
        queueSave();
        modal.remove();
      };
    });
  } catch (error) {
    showError("버전 기록을 불러오지 못했습니다: " + errorMessage(error));
  }
}

function replaceTextInNode(root, search, replacement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  let count = 0;
  nodes.forEach(n => {
    if (!n.nodeValue.includes(search)) return;
    const parts = n.nodeValue.split(search);
    count += parts.length - 1;
    n.nodeValue = parts.join(replacement);
  });
  return count;
}

function findText() {
  const term = prompt("찾을 단어를 입력하세요.");
  if (!term || !currentBook) return;
  let count = 0;
  currentBook.chapters.forEach(ch => {
    count += htmlToBookText(ch.content || "").split(term).length - 1;
  });
  if (!count) return showError('"' + term + '"을(를) 찾지 못했습니다.');
  const editor = document.getElementById("editor");
  if (editor) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const index = node.nodeValue.indexOf(term);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node,index); range.setEnd(node,index + term.length);
        const selection = window.getSelection();
        selection.removeAllRanges(); selection.addRange(range);
        editor.focus();
        break;
      }
    }
  }
  alert('책 전체에서 "' + term + '"을(를) ' + count + '번 찾았습니다.');
}

function replaceInBook() {
  const search = prompt("찾을 단어를 입력하세요.");
  if (!search || !currentBook) return;
  const replacement = prompt('"' + search + '"을(를) 무엇으로 바꿀까요?');
  if (replacement === null) return;
  let total = 0;
  currentBook.chapters.forEach(ch => {
    const holder = document.createElement("div");
    holder.innerHTML = ch.content || "";
    total += replaceTextInNode(holder, search, replacement);
    ch.content = holder.innerHTML;
  });
  renderEditorContent();
  updateStats();
  currentBook.updatedMillis = Date.now();
  queueSave();
  alert(total + "곳을 바꿨습니다.");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPdf() {
  if (!currentBook) return;
  const w = window.open("", "_blank");
  if (!w) return showError("팝업이 차단되어 PDF 내보내기를 열 수 없습니다.");
  const chapters = currentBook.chapters || [];
  w.document.write(
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' +
    escapeHtml(currentBook.title || "책") +
    '</title><style>@page{size:A4;margin:22mm 20mm}body{font-family:"Noto Serif KR","Malgun Gothic",serif;line-height:1.9;color:#222}h1{text-align:center;font-size:30pt;margin:80px 0 100px}h2{font-size:20pt;margin-top:45px;page-break-before:always}.chapter:first-of-type h2{page-break-before:auto}.content{font-size:11.5pt}img{max-width:100%}</style></head><body>' +
    '<h1>' + escapeHtml(currentBook.title || "제목 없는 책") + '</h1>' +
    chapters.map((ch,i) => '<section class="chapter"><h2>' + escapeHtml(ch.title || ("제" + (i+1) + "장")) + '</h2><div class="content">' + (ch.content || "") + '</div></section>').join("") +
    '</body></html>'
  );
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 500);
}

async function exportDocx() {
  if (!currentBook) return;
  try {
    const { Document, Packer, Paragraph, TextRun } =
      await import("https://cdn.jsdelivr.net/npm/docx@9.9.0/+esm");
    const children = [
      new Paragraph({children:[new TextRun({text:currentBook.title || "제목 없는 책",bold:true,size:36})]})
    ];
    (currentBook.chapters || []).forEach((ch,i) => {
      children.push(new Paragraph({children:[new TextRun({text:ch.title || ("제" + (i+1) + "장"),bold:true,size:28})]}));
      htmlToBookText(ch.content || "").split(/\n+/).forEach(line =>
        children.push(new Paragraph({children:[new TextRun(line)]}))
      );
    });
    const file = new Document({creator:getCurrentUserId(),title:currentBook.title || "Book Writing",sections:[{children}]});
    downloadBlob(await Packer.toBlob(file), (currentBook.title || "책") + ".docx");
  } catch (error) {
    showError("Word 내보내기 실패: " + error.message);
  }
}

async function exportHwp() {
  if (!currentBook) return;
  try {
    const { htmlToHwpx } =
      await import("https://cdn.jsdelivr.net/npm/@ssabrojs/hwpxjs@0.4.0/dist/browser/hwpxjs.browser.mjs");
    const html =
      "<h1>" + escapeHtml(currentBook.title || "제목 없는 책") + "</h1>" +
      (currentBook.chapters || []).map((ch,i) =>
        "<h2>" + escapeHtml(ch.title || ("제" + (i+1) + "장")) + "</h2>" + (ch.content || "")
      ).join("");
    const bytes = await htmlToHwpx(html);
    downloadBlob(new Blob([bytes],{type:"application/zip"}),(currentBook.title || "책") + ".hwpx");
  } catch (error) {
    showError("한글 내보내기 실패: " + error.message);
  }
}

/* =========================================================
   자동 저장
========================================================= */

function queueSave() {

  clearTimeout(
    saveTimer
  );


  saveTimer =
    setTimeout(
      async () => {

        if (!currentBook) {
          return;
        }


        currentBook.updatedMillis =
          Date.now();


        try {

          await saveBook(
            currentBook
          );

          await createVersionSnapshot(currentBook);


          const status =
            document.getElementById(
              "saveStatus"
            );


          if (status) {

            status.textContent =
              "저장됨";
          }


        } catch (error) {

          console.error(
            error
          );


          const status =
            document.getElementById(
              "saveStatus"
            );


          if (status) {

            status.textContent =
              "저장 실패";
          }


          showError(
            "자동 저장 실패: " +
            errorMessage(error)
          );
        }

      },
      800
    );
}


/* =========================================================
   대시보드
========================================================= */

async function dashboard() {

  await loadBooks();


  const id =
    getCurrentUserId();


  document.body.innerHTML = `

    <div class="dashboard">

      <header class="dashboard-header">

        <div class="brand">
          <span class="brand-mark">B</span>
          <div>
            <h1>Book Writing</h1>
            <span>나만의 책을 쓰는 공간</span>
          </div>
        </div>

        <div class="account">
          <span class="account-id">${escapeHtml(id)}</span>
          <button id="logoutButton">로그아웃</button>
        </div>

      </header>

      <main class="dashboard-main">

        <div class="dashboard-top">
          <div>
            <p class="eyebrow">LIBRARY</p>
            <h2>내 책</h2>
            <p class="dashboard-description">아이디어를 문장으로, 문장을 한 권의 책으로.</p>
          </div>
          <button id="newBookButton" class="new-book-button">+ 새 책</button>
        </div>

        <div id="bookList"></div>

      </main>

    </div>
  `;


  document.getElementById(
    "logoutButton"
  ).onclick =
    logout;


  document.getElementById(
    "newBookButton"
  ).onclick =
    createNewBook;


  renderBookList();
}


/* =========================================================
   새 책
========================================================= */

function createNewBook() {

  const now =
    new Date();


  const title =
    `새 책 ${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")} ${String(
      now.getHours()
    ).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(
      now.getSeconds()
    ).padStart(2, "0")}`;


  const newBook = {

    id:
      (crypto.randomUUID ? crypto.randomUUID() : `book-${Date.now()}-${Math.random().toString(36).slice(2)}`),

    title:
      title,

    WRITER:
      getCurrentUserId(),

    chapters: [

      {
        title:
          "제1장",

        content:
          ""
      }

    ],

    updatedMillis:
      Date.now()

  };


  books.unshift(
    newBook
  );


  openEditor(
    newBook
  );
}


async function deleteBook(book) {

  if (!book || !book.id) return;

  const title =
    (book.title || "제목 없는 책").trim() || "제목 없는 책";

  const confirmed = confirm(
    `"${title}"을(를) 삭제할까요?\\n\\n삭제하면 책과 모든 장의 내용이 영구적으로 삭제됩니다.`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "books", book.id));

    books = books.filter(item => item.id !== book.id);

    if (currentBook && currentBook.id === book.id) {
      currentBook = null;
    }

    dashboard();
  } catch (error) {
    showError("책 삭제 실패: " + errorMessage(error));
  }
}


/* =========================================================
   책 목록
========================================================= */

function renderBookList() {

  const list = document.getElementById("bookList");
  if (!list) return;

  if (books.length === 0) {
    list.innerHTML = `
      <div class="empty-books">
        <div class="empty-icon">책</div>
        <strong>아직 작성한 책이 없습니다.</strong>
        <p>새 책을 만들어 첫 문장을 시작해 보세요.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = books.map((book, index) => {
    const chapterCount = Array.isArray(book.chapters) ? book.chapters.length : 0;
    const title = escapeHtml(book.title || "제목 없는 책");
    const updated = book.updatedMillis
      ? new Date(book.updatedMillis).toLocaleDateString("ko-KR")
      : "";

    return `
      <article class="book-card" data-index="${index}">
        <button class="book-open" data-index="${index}" aria-label="${title} 열기">
          <div class="book-cover">
            <span>BOOK</span>
          </div>
          <div class="book-info">
            <h3>${title}</h3>
            <p>${chapterCount}개 장 · ${updated}</p>
          </div>
        </button>
        <div class="book-actions">
          <button class="open-book-button" data-index="${index}">열기</button>
          <button class="delete-book-button" data-index="${index}">삭제</button>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".book-open, .open-book-button").forEach(button => {
    button.onclick = () => openEditor(books[Number(button.dataset.index)]);
  });

  list.querySelectorAll(".delete-book-button").forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      deleteBook(books[Number(button.dataset.index)]);
    };
  });
}

/* =========================================================
   선택 영역
========================================================= */

function rememberSelection() {

  const selection =
    window.getSelection();


  if (
    !selection ||
    selection.rangeCount === 0
  ) {
    return;
  }


  savedRange =
    selection
      .getRangeAt(0)
      .cloneRange();
}


function restoreSelection() {

  if (!savedRange) {
    return;
  }


  const selection =
    window.getSelection();


  selection.removeAllRanges();

  selection.addRange(
    savedRange
  );
}


/* =========================================================
   명령
========================================================= */

function runCommand(
  command,
  value = null
) {

  restoreSelection();


  document.execCommand(
    command,
    false,
    value
  );


  rememberSelection();


  if (currentBook) {

    updateCurrentChapter();

    queueSave();
  }
}


/* =========================================================
   스타일
========================================================= */

function applyStyle(style) {

  restoreSelection();


  if (
    style ===
    "title"
  ) {

    document.execCommand(
      "formatBlock",
      false,
      "h1"
    );

  } else if (
    style ===
    "subtitle"
  ) {

    document.execCommand(
      "formatBlock",
      false,
      "h2"
    );

  } else if (
    style ===
    "normal"
  ) {

    document.execCommand(
      "formatBlock",
      false,
      "p"
    );
  }


  rememberSelection();


  if (currentBook) {

    updateCurrentChapter();

    queueSave();
  }
}


/* =========================================================
   현재 장 업데이트
========================================================= */

function updateCurrentChapter() {

  if (!currentBook) {
    return;
  }


  const editor =
    document.getElementById(
      "editor"
    );


  const chapterTitle =
    document.getElementById(
      "chapterTitle"
    );


  if (!editor) {
    return;
  }


  if (
    !Array.isArray(
      currentBook.chapters
    )
  ) {

    currentBook.chapters =
      [];
  }


  if (
    !currentBook.chapters[
      currentChapter
    ]
  ) {

    currentBook.chapters[
      currentChapter
    ] = {

      title:
        `제${currentChapter + 1}장`,

      content:
        ""
    };
  }


  currentBook.chapters[
    currentChapter
  ].content =
    editor.innerHTML;


  if (chapterTitle) {

    currentBook.chapters[
      currentChapter
    ].title =
      chapterTitle.value ||
      `제${currentChapter + 1}장`;
  }


  currentBook.updatedMillis =
    Date.now();
}


/* =========================================================
   장 열기
========================================================= */

function openChapter(index) {

  if (!currentBook) {
    return;
  }


  updateCurrentChapter();


  currentChapter =
    index;


  renderEditorContent();
}


/* =========================================================
   에디터 내용
========================================================= */

function renderEditorContent() {

  const editor =
    document.getElementById(
      "editor"
    );


  const chapterTitle =
    document.getElementById(
      "chapterTitle"
    );


  if (!editor) {
    return;
  }


  if (
    !currentBook.chapters[
      currentChapter
    ]
  ) {

    currentBook.chapters[
      currentChapter
    ] = {

      title:
        `제${currentChapter + 1}장`,

      content:
        ""
    };
  }


  const chapter =
    currentBook.chapters[
      currentChapter
    ];


  if (chapterTitle) {

    chapterTitle.value =
      chapter.title ||
      `제${currentChapter + 1}장`;
  }


  editor.innerHTML =
    chapter.content ||
    "";


  renderChapterList();
}


/* =========================================================
   장 목록
========================================================= */

function renderChapterList() {

  const list =
    document.getElementById(
      "chapterList"
    );


  if (
    !list ||
    !currentBook
  ) {
    return;
  }


  list.innerHTML =
    currentBook.chapters
      .map(
        (chapter, index) => {

          return `

            <button
              class="
                chapter-button
                ${
                  index ===
                  currentChapter
                    ? "active"
                    : ""
                }
              "
              data-index="${index}"
            >

              ${escapeHtml(
                chapter.title ||
                `제${index + 1}장`
              )}

            </button>

          `;

        }
      )
      .join("");


  list
    .querySelectorAll(
      ".chapter-button"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            openChapter(
              Number(
                button.dataset.index
              )
            );

          };

      }
    );
}


/* =========================================================
   에디터
========================================================= */

function openEditor(book) {

  currentBook =
    book;


  if (
    !Array.isArray(
      currentBook.chapters
    ) ||
    currentBook.chapters.length === 0
  ) {

    currentBook.chapters = [

      {
        title:
          "제1장",

        content:
          ""
      }

    ];
  }


  currentChapter =
    0;


  document.body.innerHTML = `

    <div class="editor-page">


      <header class="editor-header">

        <button id="backButton">
          ←
        </button>


        <input
          id="bookTitle"
          value="${escapeHtml(
            currentBook.title ||
            "제목 없는 책"
          )}"
          placeholder="책 제목"
        >


        <div class="editor-header-right">
          <span id="saveStatus">저장됨</span>
          <button id="historyButton" class="header-tool-button">기록</button>
          <button id="exportButton" class="header-tool-button">내보내기</button>
          <button id="deleteCurrentBookButton" class="danger-button">책 삭제</button>
        </div>

      </header>


      <div class="editor-layout">


        <aside
          class="chapter-sidebar"
        >

          <div
            class="chapter-header"
          >

            <strong>
              목차
            </strong>


            <button
              id="addChapterButton"
            >
              +
            </button>

          </div>


          <div
            id="chapterList"
          ></div>

        </aside>


        <main
          class="editor-main"
        >


          <div class="toolbar">
            <button data-command="undo" title="실행 취소">↶</button>
            <button data-command="redo" title="다시 실행">↷</button>
            <span class="toolbar-divider"></span>
            <button data-search="find" title="찾기">찾기</button>
            <button data-search="replace" title="찾기 및 바꾸기">바꾸기</button>
            <span class="toolbar-divider"></span>

            <button
              data-command="bold"
            >
              B
            </button>


            <button
              data-command="italic"
            >
              I
            </button>


            <button
              data-command="underline"
            >
              U
            </button>


            <button
              data-color="#000000"
            >
              검정
            </button>


            <button
              data-color="#ff0000"
            >
              빨강
            </button>


            <button
              data-color="#0000ff"
            >
              파랑
            </button>


            <button
              data-style="title"
            >
              제목
            </button>


            <button
              data-style="subtitle"
            >
              소제목
            </button>


            <button
              data-style="normal"
            >
              본문
            </button>

          </div>


          <input
            id="chapterTitle"
            class="chapter-title-input"
            placeholder="장 제목"
          >


          <div
            id="editor"
            class="editor"
            contenteditable="true"
            spellcheck="true"
          ></div>

          <div id="editorStats" class="editor-stats"></div>


        </main>

      </div>

    </div>
  `;


  /* -----------------------------------------
     뒤로가기
  ----------------------------------------- */

  document.getElementById(
    "backButton"
  ).onclick =
    async () => {

      updateCurrentChapter();


      try {

        await saveBook(
          currentBook
        );

      } catch (error) {

        showError(
          "저장 실패: " +
          errorMessage(error)
        );

        return;
      }


      dashboard();
    };


  document.getElementById("deleteCurrentBookButton").onclick = () => {
    deleteBook(currentBook);
  };

  document.getElementById("historyButton").onclick = showVersionHistory;

  document.getElementById("exportButton").onclick = () => {
    const choice = prompt("내보내기 형식: PDF / DOCX / HWPX", "PDF");
    if (!choice) return;
    const format = choice.trim().toLowerCase();
    if (format === "pdf") exportPdf();
    else if (format === "docx" || format === "word") exportDocx();
    else if (format === "hwpx" || format === "hwp" || format === "한글") exportHwp();
    else showError("PDF, DOCX, HWPX 중 하나를 입력하세요.");
  };


  /* -----------------------------------------
     책 제목
  ----------------------------------------- */

  document.getElementById(
    "bookTitle"
  ).addEventListener(
    "input",
    event => {

      currentBook.title =
        event.target.value;


      currentBook.updatedMillis =
        Date.now();


      queueSave();
    }
  );


  /* -----------------------------------------
     장 제목
  ----------------------------------------- */

  document.getElementById(
    "chapterTitle"
  ).addEventListener(
    "input",
    event => {

      if (
        !currentBook.chapters[
          currentChapter
        ]
      ) {

        currentBook.chapters[
          currentChapter
        ] = {

          title:
            `제${currentChapter + 1}장`,

          content:
            ""
        };
      }


      currentBook.chapters[
        currentChapter
      ].title =
        event.target.value;


      currentBook.updatedMillis =
        Date.now();


      renderChapterList();

      queueSave();
    }
  );


  /* -----------------------------------------
     본문
  ----------------------------------------- */

  document.getElementById(
    "editor"
  ).addEventListener(
    "input",
    () => {

      updateCurrentChapter();
      updateStats();

      queueSave();


      const status =
        document.getElementById(
          "saveStatus"
        );


      if (status) {

        status.textContent =
          "저장 중...";
      }
    }
  );


  /* -----------------------------------------
     단축키 / 검색 / 실행 취소
  ----------------------------------------- */

  document.addEventListener("keydown", event => {
    if (!document.getElementById("editor")) return;
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === "f") {
      event.preventDefault();
      findText();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && key === "h") {
      event.preventDefault();
      replaceInBook();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (key === "y" || (event.shiftKey && key === "z"))) {
      event.preventDefault();
      document.execCommand("redo");
      updateCurrentChapter();
      updateStats();
      queueSave();
    }
  });

  document.querySelectorAll("[data-search]").forEach(button => {
    button.onclick = () => button.dataset.search === "find" ? findText() : replaceInBook();
  });

  /* -----------------------------------------
     선택 영역
  ----------------------------------------- */

  document.addEventListener(
    "selectionchange",
    () => {

      const editor =
        document.getElementById(
          "editor"
        );


      if (!editor) {
        return;
      }


      const selection =
        window.getSelection();


      if (
        selection &&
        selection.rangeCount > 0 &&
        editor.contains(
          selection.anchorNode
        )
      ) {

        rememberSelection();
      }
    }
  );


  /* -----------------------------------------
     툴바
  ----------------------------------------- */

  document
    .querySelectorAll(
      "[data-command]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            runCommand(
              button.dataset.command
            );

          };

      }
    );


  document
    .querySelectorAll(
      "[data-color]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            runCommand(
              "foreColor",
              button.dataset.color
            );

          };

      }
    );


  document
    .querySelectorAll(
      "[data-style]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            applyStyle(
              button.dataset.style
            );

          };

      }
    );


  /* -----------------------------------------
     새 장
  ----------------------------------------- */

  document.getElementById(
    "addChapterButton"
  ).onclick =
    () => {

      updateCurrentChapter();


      currentBook.chapters.push({

        title:
          `제${currentBook.chapters.length + 1}장`,

        content:
          ""

      });


      currentChapter =
        currentBook.chapters.length - 1;


      renderEditorContent();


      currentBook.updatedMillis =
        Date.now();


      queueSave();
    };


  renderEditorContent();
  updateStats();
}


/* =========================================================
   시작
========================================================= */

async function start() {

  /*
    localStorage에 로그인 정보가 있으면
    자동으로 로그인 상태를 유지한다.
  */

  const savedUser =
    localStorage.getItem(
      "bookWritingUser"
    );


  if (savedUser) {

    currentUserId =
      savedUser;


    try {

      /*
        실제로 users/{ID}가 존재하는지 확인
      */

      const userSnapshot =
        await getDoc(
          doc(
            db,
            "users",
            savedUser
          )
        );


      if (
        userSnapshot.exists()
      ) {

        dashboard();

        return;
      }


      /*
        사용자가 삭제된 경우
      */

      clearLogin();

    } catch (error) {

      console.error(
        error
      );

      clearLogin();
    }
  }


  authScreen();
}


start();
