import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
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
const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   전역 변수
========================================================= */

let user = null;
let books = [];
let currentBook = null;
let currentChapter = 0;
let saveTimer = null;


/* =========================================================
   공통 함수
========================================================= */

function getCurrentUserId() {
  if (!user) return "";

  if (user.email && user.email.includes("@")) {
    return user.email.split("@")[0].toLowerCase();
  }

  return "";
}


function getCurrentUserUid() {
  return user ? user.uid : "";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   Firebase 에러
========================================================= */

function errorMessage(error) {
  const code = error?.code || "";

  switch (code) {

    case "auth/invalid-credential":
      return "아이디 또는 비밀번호가 올바르지 않습니다.";

    case "auth/invalid-login-credentials":
      return "아이디 또는 비밀번호가 올바르지 않습니다.";

    case "auth/user-not-found":
      return "존재하지 않는 아이디입니다.";

    case "auth/wrong-password":
      return "비밀번호가 올바르지 않습니다.";

    case "auth/email-already-in-use":
      return "이미 존재하는 아이디입니다.";

    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다.";

    case "auth/invalid-email":
      return "아이디 형식이 올바르지 않습니다.";

    case "auth/operation-not-allowed":
      return "Firebase Authentication에서 이메일/비밀번호 로그인이 활성화되어 있지 않습니다.";

    case "auth/configuration-not-found":
      return "Firebase Authentication 설정을 찾을 수 없습니다. Firebase Console의 Authentication 설정을 확인하세요.";

    case "auth/invalid-api-key":
      return "Firebase API Key가 올바르지 않습니다.";

    case "auth/app-not-authorized":
      return "현재 사이트가 Firebase Authentication에서 허용되지 않은 도메인입니다.";

    case "auth/unauthorized-domain":
      return "현재 사이트 도메인이 Firebase Authentication의 승인된 도메인에 없습니다.";

    case "permission-denied":
      return "Firestore 권한이 없습니다. Firestore 보안 규칙을 확인하세요.";

    case "failed-precondition":
      return "Firestore 설정 또는 인덱스 문제가 발생했습니다.";

    case "unavailable":
      return "Firebase 서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.";

    default:
      return error?.message || "알 수 없는 오류가 발생했습니다.";
  }
}


function showError(message) {
  const old = document.querySelector(".error-message");

  if (old) old.remove();

  const box = document.createElement("div");
  box.className = "error-message";
  box.textContent = message;

  document.body.appendChild(box);

  setTimeout(() => {
    box.remove();
  }, 5000);
}


function showFatalError(error) {
  console.error(error);

  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:30px;
      box-sizing:border-box;
      font-family:Arial,sans-serif;
    ">
      <div style="
        width:min(500px,100%);
        padding:30px;
        border:1px solid #ddd;
        border-radius:16px;
        background:white;
        box-sizing:border-box;
      ">
        <h2 style="margin-top:0;">오류가 발생했습니다.</h2>

        <p style="line-height:1.6;">
          ${escapeHtml(errorMessage(error))}
        </p>

        <button
          onclick="location.reload()"
          style="
            padding:12px 18px;
            border:0;
            border-radius:8px;
            cursor:pointer;
          "
        >
          새로고침
        </button>
      </div>
    </div>
  `;
}


/* =========================================================
   로그인 / 회원가입 화면
========================================================= */

function authScreen() {

  document.body.innerHTML = `
    <div class="auth-container">

      <div class="auth-box">

        <h1>Book Writing</h1>

        <div class="auth-tabs">
          <button id="loginTab" class="active">로그인</button>
          <button id="signupTab">회원가입</button>
        </div>


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


        <div id="signupForm" style="display:none;">

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


  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");


  loginTab.onclick = () => {

    loginTab.classList.add("active");
    signupTab.classList.remove("active");

    loginForm.style.display = "";
    signupForm.style.display = "none";
  };


  signupTab.onclick = () => {

    signupTab.classList.add("active");
    loginTab.classList.remove("active");

    signupForm.style.display = "";
    loginForm.style.display = "none";
  };


  document.getElementById("loginButton").onclick = login;

  document.getElementById("signupButton").onclick = signup;
}


/* =========================================================
   회원가입
========================================================= */

async function signup() {

  const userId = document.getElementById("signupId");
  const password = document.getElementById("signupPassword");
  const password2 = document.getElementById("signupPassword2");

  const id = userId.value.trim().toLowerCase();
  const pw = password.value;
  const pw2 = password2.value;


  if (!id) {
    showError("아이디를 입력하세요.");
    return;
  }


  if (!/^[a-zA-Z0-9가-힣_-]+$/.test(id)) {
    showError("아이디에는 영문, 숫자, 한글, _, -만 사용할 수 있습니다.");
    return;
  }


  if (!pw) {
    showError("비밀번호를 입력하세요.");
    return;
  }


  if (pw.length < 6) {
    showError("비밀번호는 6자 이상이어야 합니다.");
    return;
  }


  if (pw !== pw2) {
    showError("비밀번호가 서로 다릅니다.");
    return;
  }


  /*
    Firebase Authentication에서는 이메일 형식이 필요하므로
    실제 이메일 대신 내부용 이메일 주소를 사용한다.
  */

  const mail = id + "@book-writing.local";


  try {

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        mail,
        pw
      );


    /*
      users/{아이디}

      ID
      PASSWORD
      uid
      email
      createdAt
    */

    await setDoc(
      doc(db, "users", id),
      {
        ID: id,
        PASSWORD: pw,
        uid: credential.user.uid,
        email: mail,
        createdAt: serverTimestamp()
      }
    );


    alert("회원가입이 완료되었습니다.");

  } catch (error) {

    console.error(error);
    showError(errorMessage(error));
  }
}


/* =========================================================
   로그인
========================================================= */

async function login() {

  const userId =
    document.getElementById("loginId");

  const password =
    document.getElementById("loginPassword");


  const id = userId.value.trim().toLowerCase();
  const pw = password.value;


  if (!id) {
    showError("아이디를 입력하세요.");
    return;
  }


  if (!pw) {
    showError("비밀번호를 입력하세요.");
    return;
  }


  const mail = id + "@book-writing.local";


  try {

    await signInWithEmailAndPassword(
      auth,
      mail,
      pw
    );

  } catch (error) {

    console.error(error);
    showError(errorMessage(error));
  }
}


/* =========================================================
   로그아웃
========================================================= */

async function logout() {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(error);
    showError(errorMessage(error));
  }
}


/* =========================================================
   책 데이터 → 텍스트
========================================================= */

function htmlToBookText(html) {

  const div = document.createElement("div");
  div.innerHTML = html;


  const text = div.innerText || div.textContent || "";


  return text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/* =========================================================
   책 상세 정보
========================================================= */

function bookDetail(book) {

  if (!book) return "";


  const chapters = Array.isArray(book.chapters)
    ? book.chapters
    : [];


  return chapters
    .map((chapter, index) => {

      const title =
        chapter.title ||
        `제${index + 1}장`;

      const content =
        htmlToBookText(
          chapter.content || ""
        );


      return `[CHAPTER ${index + 1}] ${title}\n${content}`;

    })
    .join("\n\n");
}


/* =========================================================
   책 불러오기
========================================================= */

async function loadBooks() {

  const currentUserId =
    getCurrentUserId();


  if (!currentUserId) {
    books = [];
    return;
  }


  try {

    /*
      현재 로그인한 사용자의 책만 가져온다.
    */

    const booksQuery = query(
      collection(db, "books"),
      where("WRITER", "==", currentUserId)
    );


    const snapshot =
      await getDocs(booksQuery);


    books = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .sort(
        (a, b) =>
          (b.updatedMillis || 0) -
          (a.updatedMillis || 0)
      );


    /*
      예전 데이터에는 chapters가 없을 수 있으므로
      안전하게 기본값을 넣는다.
    */

    books = books.map(book => {

      if (!Array.isArray(book.chapters)) {

        book.chapters = [
          {
            title: "제1장",
            content: ""
          }
        ];

      }

      return book;
    });


  } catch (error) {

    console.error(error);

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


  const writer =
    getCurrentUserId();


  const writerUid =
    getCurrentUserUid();


  if (!writer || !writerUid) {
    return;
  }


  const title =
    (book.title || "제목 없는 책")
      .trim() ||
    "제목 없는 책";


  const detail =
    bookDetail(book);


  /*
    현재 구조에서는 책 제목을 문서 ID로 사용한다.
  */

  await setDoc(
    doc(db, "books", title),
    {
      WRITER: writer,
      WRITER_UID: writerUid,

      DITAIL: detail,

      title: title,

      chapters:
        Array.isArray(book.chapters)
          ? book.chapters
          : [],

      updatedMillis:
        book.updatedMillis ||
        Date.now(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );


  /*
    로컬 목록도 즉시 갱신
  */

  book.id = title;
  book.title = title;
  book.WRITER = writer;
  book.WRITER_UID = writerUid;
  book.DITAIL = detail;
}


/* =========================================================
   자동 저장 예약
========================================================= */

function queueSave() {

  clearTimeout(saveTimer);


  saveTimer = setTimeout(
    async () => {

      if (!currentBook) return;


      currentBook.updatedMillis =
        Date.now();


      try {

        await saveBook(currentBook);

        const status =
          document.getElementById(
            "saveStatus"
          );

        if (status) {
          status.textContent =
            "저장됨";
        }

      } catch (error) {

        console.error(error);

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


  const currentUserId =
    getCurrentUserId();


  document.body.innerHTML = `

    <div class="dashboard">

      <header>

        <div>
          <h1>Book Writing</h1>

          <span>
            ${escapeHtml(currentUserId)}
          </span>
        </div>

        <button id="logoutButton">
          로그아웃
        </button>

      </header>


      <main>

        <div class="dashboard-top">

          <h2>내 책</h2>

          <button id="newBookButton">
            + 새 책
          </button>

        </div>


        <div id="bookList">

        </div>

      </main>

    </div>
  `;


  document.getElementById(
    "logoutButton"
  ).onclick = logout;


  document.getElementById(
    "newBookButton"
  ).onclick = () => {

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

      id: title,

      title: title,

      WRITER:
        getCurrentUserId(),

      WRITER_UID:
        getCurrentUserUid(),

      chapters: [
        {
          title: "제1장",
          content: ""
        }
      ],

      updatedMillis:
        Date.now()

    };


    books.unshift(newBook);

    openEditor(newBook);
  };


  renderBookList();
}


/* =========================================================
   책 목록
========================================================= */

function renderBookList() {

  const list =
    document.getElementById(
      "bookList"
    );


  if (!list) return;


  if (books.length === 0) {

    list.innerHTML = `
      <div class="empty-books">
        아직 작성한 책이 없습니다.
      </div>
    `;

    return;
  }


  list.innerHTML =
    books
      .map((book, index) => {

        const chapterCount =
          Array.isArray(book.chapters)
            ? book.chapters.length
            : 0;


        return `

          <div
            class="book-card"
            data-index="${index}"
          >

            <div>

              <h3>
                ${escapeHtml(
                  book.title ||
                  "제목 없는 책"
                )}
              </h3>

              <p>
                ${chapterCount}개 장
              </p>

            </div>

            <button
              class="open-book-button"
              data-index="${index}"
            >
              열기
            </button>

          </div>

        `;
      })
      .join("");


  document
    .querySelectorAll(
      ".open-book-button"
    )
    .forEach(button => {

      button.onclick = () => {

        const index =
          Number(
            button.dataset.index
          );


        openEditor(
          books[index]
        );
      };

    });
}


/* =========================================================
   선택 영역 저장 / 복원
========================================================= */

let savedRange = null;


function rememberSelection() {

  const selection =
    window.getSelection();


  if (
    !selection ||
    selection.rangeCount === 0
  ) {
    return;
  }


  const range =
    selection.getRangeAt(0);


  savedRange =
    range.cloneRange();
}


function restoreSelection() {

  if (!savedRange) return;


  const selection =
    window.getSelection();


  selection.removeAllRanges();

  selection.addRange(
    savedRange
  );
}


/* =========================================================
   명령 실행
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
   스타일 적용
========================================================= */

function applyStyle(style) {

  restoreSelection();


  if (style === "title") {

    document.execCommand(
      "formatBlock",
      false,
      "h1"
    );

  } else if (style === "subtitle") {

    document.execCommand(
      "formatBlock",
      false,
      "h2"
    );

  } else if (style === "normal") {

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

  if (!currentBook) return;


  const editor =
    document.getElementById(
      "editor"
    );


  const chapterTitle =
    document.getElementById(
      "chapterTitle"
    );


  if (!editor) return;


  if (
    !Array.isArray(
      currentBook.chapters
    )
  ) {

    currentBook.chapters = [];
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

      content: ""

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

  if (!currentBook) return;


  updateCurrentChapter();


  currentChapter = index;


  renderEditorContent();
}


/* =========================================================
   에디터 내용 렌더링
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


  if (!editor) return;


  if (
    !currentBook.chapters ||
    !currentBook.chapters[
      currentChapter
    ]
  ) {

    currentBook.chapters[
      currentChapter
    ] = {

      title:
        `제${currentChapter + 1}장`,

      content: ""
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
    chapter.content || "";


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


  if (!list || !currentBook) {
    return;
  }


  list.innerHTML =
    currentBook.chapters
      .map((chapter, index) => {

        return `

          <button
            class="
              chapter-button
              ${
                index === currentChapter
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

      })
      .join("");


  list
    .querySelectorAll(
      ".chapter-button"
    )
    .forEach(button => {

      button.onclick = () => {

        openChapter(
          Number(
            button.dataset.index
          )
        );

      };

    });
}


/* =========================================================
   에디터
========================================================= */

function openEditor(book) {

  currentBook = book;


  if (
    !Array.isArray(
      currentBook.chapters
    ) ||
    currentBook.chapters.length === 0
  ) {

    currentBook.chapters = [
      {
        title: "제1장",
        content: ""
      }
    ];
  }


  currentChapter = 0;


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


        <span id="saveStatus">
          저장됨
        </span>

      </header>



      <div class="editor-layout">


        <aside class="chapter-sidebar">

          <div class="chapter-header">

            <strong>
              목차
            </strong>

            <button id="addChapterButton">
              +
            </button>

          </div>


          <div id="chapterList">
          </div>

        </aside>



        <main class="editor-main">


          <div class="toolbar">

            <button data-command="bold">
              B
            </button>

            <button data-command="italic">
              I
            </button>

            <button data-command="underline">
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
  ).onclick = async () => {

    updateCurrentChapter();


    try {

      await saveBook(
        currentBook
      );

    } catch (error) {

      console.error(error);

      showError(
        "저장 실패: " +
        errorMessage(error)
      );

      return;
    }


    dashboard();
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

          content: ""
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
     본문 입력
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

      if (!editor) return;


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
    .forEach(button => {

      button.onclick = () => {

        runCommand(
          button.dataset.command
        );

      };

    });


  document
    .querySelectorAll(
      "[data-color]"
    )
    .forEach(button => {

      button.onclick = () => {

        runCommand(
          "foreColor",
          button.dataset.color
        );

      };

    });


  document
    .querySelectorAll(
      "[data-style]"
    )
    .forEach(button => {

      button.onclick = () => {

        applyStyle(
          button.dataset.style
        );

      };

    });


  /* -----------------------------------------
     새 장
  ----------------------------------------- */

  document.getElementById(
    "addChapterButton"
  ).onclick = () => {

    updateCurrentChapter();


    currentBook.chapters.push({

      title:
        `제${currentBook.chapters.length + 1}장`,

      content: ""

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
   로그인 상태 감시
========================================================= */

onAuthStateChanged(
  auth,

  nextUser => {

    user = nextUser;


    if (user) {

      dashboard();

    } else {

      authScreen();

    }

  },

  error => {

    console.error(error);

    showFatalError(error);

  }
);
