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
