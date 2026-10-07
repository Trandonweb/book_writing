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

const root = document.getElementById("app");


/* =========================================================
   전역 상태
========================================================= */

let user = null;
let books = [];
let saveTimer = null;
let savedRange = null;


/* =========================================================
   기본 함수
========================================================= */

const makeId = () =>
  Date.now().toString(36) +
  Math.random().toString(36).slice(2, 8);


/*
 * Firebase Authentication에 실제로 저장되는 이메일은
 *
 *     아이디@book-writing.local
 *
 * 형식이다.
 *
 * 따라서 현재 로그인한 사용자의 아이디는
 * 이메일의 @ 앞부분으로 가져온다.
 */
function getCurrentUserId() {
  if (!user) return "";

  if (user.email && user.email.includes("@")) {
    return user.email.split("@")[0].toLowerCase();
  }

  return "";
}


function getCurrentUserEmail() {
  return user?.email || "";
}


function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}


/* =========================================================
   오류 메시지
========================================================= */

function errorMessage(error) {
  const messages = {

    /* Authentication */

    "auth/email-already-in-use":
      "이미 가입된 아이디입니다.",

    "auth/invalid-email":
      "아이디 형식이 올바르지 않습니다.",

    "auth/weak-password":
      "비밀번호는 6자 이상이어야 합니다.",

    "auth/invalid-credential":
      "아이디 또는 비밀번호가 올바르지 않습니다.",

    "auth/user-not-found":
      "존재하지 않는 아이디입니다.",

    "auth/wrong-password":
      "비밀번호가 올바르지 않습니다.",

    "auth/too-many-requests":
      "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",

    "auth/network-request-failed":
      "네트워크 연결을 확인해 주세요.",

    "auth/operation-not-allowed":
      "Firebase Authentication의 이메일/비밀번호 로그인이 활성화되어 있지 않습니다.",

    "auth/configuration-not-found":
      "Firebase Authentication 설정을 찾을 수 없습니다. Firebase 콘솔의 Authentication 설정을 확인해 주세요.",

    "auth/invalid-api-key":
      "Firebase API Key가 올바르지 않습니다.",

    "auth/app-not-authorized":
      "현재 사이트가 Firebase 프로젝트에서 허용되지 않았습니다.",

    "auth/unauthorized-domain":
      "현재 사이트 도메인이 Firebase Authentication에서 허용되지 않았습니다.",

    "auth/requires-recent-login":
      "보안을 위해 다시 로그인해야 합니다.",


    /* Firestore */

    "permission-denied":
      "Firestore 권한이 없습니다. Firestore 보안 규칙을 확인해 주세요.",

    "failed-precondition":
      "Firestore 설정 또는 색인에 문제가 있습니다.",

    "unavailable":
      "Firebase 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",


    /* Custom */

    "custom/invalid-id":
      "아이디는 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있고 3~20자로 입력해 주세요.",

    "custom/password-mismatch":
      "비밀번호가 서로 일치하지 않습니다."

  };

  return (
    messages[error?.code] ||
    error?.message ||
    "오류가 발생했습니다."
  );
}


/* =========================================================
   치명적 오류 화면
========================================================= */

function showFatalError(error) {
  console.error("Fatal error:", error);

  root.innerHTML = `
    <div class="auth">
      <div class="auth-card">

        <div class="logo">
          ✦ Book <span>Writing</span>
        </div>

        <h1>페이지를 불러오지 못했습니다.</h1>

        <p class="sub">
          ${escapeHtml(errorMessage(error))}
        </p>

        <button class="primary" id="reloadButton">
          새로고침
        </button>

      </div>
    </div>
  `;

  document
    .getElementById("reloadButton")
    ?.addEventListener("click", () => location.reload());
}


/* =========================================================
   로그인 / 회원가입 화면
========================================================= */

function authScreen() {

  root.innerHTML = `
    <div class="auth">

      <div class="auth-card">

        <div class="logo">
          ✦ Book <span>Writing</span>
        </div>

        <h1>당신의 책을 시작하세요.</h1>

        <p class="sub">
          아이디어를 문장으로, 문장을 한 권의 책으로.
        </p>

        <div class="tabs">
          <button
            id="loginTab"
            class="active"
            type="button"
          >
            로그인
          </button>

          <button
            id="signupTab"
            type="button"
          >
            회원가입
          </button>
        </div>

        <form id="authForm">

          <div class="field">

            <label for="userId">
              아이디
            </label>

            <input
              id="userId"
              type="text"
              autocomplete="username"
              minlength="3"
              maxlength="20"
              required
            >

          </div>


          <div class="field">

            <label for="password">
              비밀번호
            </label>

            <input
              id="password"
              type="password"
              autocomplete="current-password"
              minlength="6"
              required
            >

          </div>


          <div
            class="field"
            id="passwordConfirmField"
            style="display:none"
          >

            <label for="passwordConfirm">
              비밀번호 확인
            </label>

            <input
              id="passwordConfirm"
              type="password"
              autocomplete="new-password"
              minlength="6"
            >

          </div>


          <button
            class="primary"
            id="submitButton"
            type="submit"
          >
            로그인
          </button>

        </form>


        <div class="demo">
          아이디는 영문 소문자, 숫자, 밑줄(_) 3~20자로 사용할 수 있습니다.
        </div>

      </div>

    </div>
  `;


  let mode = "login";


  const loginTab =
    document.getElementById("loginTab");

  const signupTab =
    document.getElementById("signupTab");

  const form =
    document.getElementById("authForm");

  const submitButton =
    document.getElementById("submitButton");

  const userId =
    document.getElementById("userId");

  const password =
    document.getElementById("password");

  const passwordConfirm =
    document.getElementById("passwordConfirm");

  const passwordConfirmField =
    document.getElementById("passwordConfirmField");


  function switchMode(nextMode) {

    mode = nextMode;

    loginTab.classList.toggle(
      "active",
      mode === "login"
    );

    signupTab.classList.toggle(
      "active",
      mode === "signup"
    );

    submitButton.textContent =
      mode === "login"
        ? "로그인"
        : "회원가입";

    passwordConfirmField.style.display =
      mode === "signup"
        ? "block"
        : "none";

    passwordConfirm.required =
      mode === "signup";

    passwordConfirm.value = "";

    password.autocomplete =
      mode === "login"
        ? "current-password"
        : "new-password";
  }


  loginTab.addEventListener(
    "click",
    () => switchMode("login")
  );

  signupTab.addEventListener(
    "click",
    () => switchMode("signup")
  );


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      submitButton.disabled = true;

      try {

        const id =
          userId.value.trim().toLowerCase();


        /* 아이디 검사 */

        if (!/^[a-z0-9_]{3,20}$/.test(id)) {
          throw {
            code: "custom/invalid-id"
          };
        }


        /*
         * Firebase Authentication은 이메일 형태의
         * 로그인 식별자를 필요로 한다.
         *
         * 사용자는 실제 이메일을 입력하지 않고
         * 아이디만 입력한다.
         */

        const mail =
          id + "@book-writing.local";


        /* =========================
           회원가입
        ========================= */

        if (mode === "signup") {

          if (
            password.value !==
            passwordConfirm.value
          ) {
            throw {
              code: "custom/password-mismatch"
            };
          }


          const credential =
            await createUserWithEmailAndPassword(
              auth,
              mail,
              password.value
            );


          /*
           * Firestore에는 비밀번호를 저장하지 않는다.
           *
           * 비밀번호는 Firebase Authentication이 관리한다.
           */

          await setDoc(
            doc(db, "users", id),
            {
              ID: id,
              uid: credential.user.uid,
              email: mail,
              createdAt: serverTimestamp()
            }
          );


          /*
           * createUserWithEmailAndPassword 실행 후
           * Firebase는 자동으로 로그인 상태가 된다.
           *
           * 따라서 여기서 별도의 로그인은 필요 없다.
           */

        }

        /* =========================
           로그인
        ========================= */

        else {

          await signInWithEmailAndPassword(
            auth,
            mail,
            password.value
          );

        }

      } catch (error) {

        console.error("Authentication error:", error);

        alert(errorMessage(error));

        submitButton.disabled = false;
      }
    }
  );
}


/* =========================================================
   HTML → 책 텍스트
========================================================= */

function htmlToBookText(html) {

  const container =
    document.createElement("div");

  container.innerHTML = html || "";


  const serialize = node => {

    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue || "";
    }


    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }


    const tag =
      node.tagName.toLowerCase();


    const inner =
      Array.from(node.childNodes)
        .map(serialize)
        .join("");


    if (tag === "br") {
      return "\n";
    }


    if (
      tag === "b" ||
      tag === "strong"
    ) {
      return "***" + inner + "***";
    }


    if (
      tag === "i" ||
      tag === "em"
    ) {
      return "###" + inner + "###";
    }


    if (
      node.classList.contains("text-title")
    ) {
      return (
        "^^^" +
        inner +
        "^^^&&pt = 제목&&"
      );
    }


    if (
      node.classList.contains("text-toc")
    ) {
      return (
        "^^^" +
        inner +
        "^^^&&pt = 목차&&"
      );
    }


    if (
      node.classList.contains("text-subtitle")
    ) {
      return (
        "^^^" +
        inner +
        "^^^&&pt = 소제목&&"
      );
    }


    if (
      node.classList.contains("text-content")
    ) {
      return (
        "^^^" +
        inner +
        "^^^&&pt = 내용&&"
      );
    }


    if (
      /^(div|p|section|article|h1|h2|h3|h4|li)$/.test(tag)
    ) {
      return inner + "\n";
    }


    return inner;
  };


  return Array.from(container.childNodes)
    .map(serialize)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/* =========================================================
   책 상세 텍스트
========================================================= */

function bookDetail(book) {

  return (book.chapters || [])
    .map((chapter, index) => {

      const title =
        chapter.title ||
        (index + 1) + "장";

      const content =
        htmlToBookText(chapter.html || "");

      return (
        "[CHAPTER " +
        (index + 1) +
        "]\n" +
        title +
        "\n" +
        content
      );

    })
    .join("\n\n");
}


/* =========================================================
   현재 사용자의 책 불러오기
========================================================= */

async function loadBooks() {

  const currentUserId =
    getCurrentUserId();


  if (!currentUserId) {
    books = [];
    return;
  }


  /*
   * 현재 로그인한 사람의 책만 가져온다.
   */

  const booksQuery =
    query(
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
}


/* =========================================================
   책 저장
========================================================= */

async function saveBook(book) {

  const currentUserId =
    getCurrentUserId();

  const currentUserUid =
    user?.uid || "";


  if (!currentUserId || !currentUserUid) {
    throw new Error(
      "로그인 정보가 없습니다."
    );
  }


  book.updatedMillis =
    Date.now();


  const title =
    (book.title || "제목 없는 책")
      .trim() ||
    "제목 없는 책";


  const writer =
    currentUserId;


  const detail =
    bookDetail(book);


  /*
   * 기존 구조를 유지하기 위해
   * 책 문서 ID는 제목을 사용한다.
   */

  await setDoc(
    doc(db, "books", title),
    {
      WRITER: writer,

      WRITER_UID: currentUserUid,

      DITAIL: detail,

      title: title,

      chapters: book.chapters || [],

      updatedMillis:
        book.updatedMillis,

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );


  book.id = title;


  const index =
    books.findIndex(
      item => item.id === book.id
    );


  if (index === -1) {

    books.push({
      ...book,
      id: title
    });

  } else {

    books[index] = {
      ...book,
      id: title
    };

  }
}


/* =========================================================
   자동 저장
========================================================= */

function queueSave(
  book,
  statusElement
) {

  clearTimeout(saveTimer);


  statusElement.textContent =
    "저장 중…";


  saveTimer =
    setTimeout(
      async () => {

        try {

          await saveBook(book);

          statusElement.textContent =
            "저장됨";

        } catch (error) {

          console.error(
            "Save error:",
            error
          );

          statusElement.textContent =
            "저장 실패";

        }

      },
      500
    );
}


/* =========================================================
   대시보드
========================================================= */

async function dashboard() {

  try {

    await loadBooks();

  } catch (error) {

    console.error(
      "Load books error:",
      error
    );


    root.innerHTML = `
      <div class="auth">

        <div class="auth-card">

          <h1>
            작품을 불러오지 못했습니다.
          </h1>

          <p class="sub">
            ${escapeHtml(
              errorMessage(error)
            )}
          </p>

          <button
            class="primary"
            id="retryButton"
          >
            다시 시도
          </button>

        </div>

      </div>
    `;


    document
      .getElementById("retryButton")
      .addEventListener(
        "click",
        dashboard
      );

    return;
  }


  root.innerHTML = `
    <div class="dashboard">

      <header class="dash-head">

        <div class="dash-brand">
          ✦ Book Writing

          <small>
            ${escapeHtml(
              getCurrentUserId()
            )}
          </small>
        </div>

        <button
          class="logout"
          id="logoutButton"
        >
          로그아웃
        </button>

      </header>


      <main class="dash-main">

        <h1 class="dash-title">
          무엇을 쓰고 있나요?
        </h1>

        <p class="dash-desc">
          새로운 책을 시작하거나,
          이전에 쓰던 작품을 이어가세요.
        </p>


        <div class="new-card">

          <div>
            <b>새 작품 만들기</b>

            <span>
              빈 페이지에서 새로운 이야기를 시작합니다.
            </span>
          </div>

          <button
            class="create"
            id="newButton"
          >
            ＋ 새로 만들기
          </button>

        </div>


        <div class="work-label">
          이전 작품
        </div>


        <div class="works">

          ${
            books.length

              ? books
                  .map(
                    book => `
                      <div
                        class="work"
                        data-id="${escapeHtml(book.id)}"
                      >

                        <h3>
                          ${escapeHtml(
                            book.title ||
                            "제목 없는 책"
                          )}
                        </h3>

                        <p>
                          ${
                            (book.chapters || [])
                              .length
                          }개 챕터
                          ·
                          ${
                            book.updatedMillis
                              ? new Date(
                                  book.updatedMillis
                                ).toLocaleDateString(
                                  "ko-KR"
                                )
                              : ""
                          }
                        </p>

                      </div>
                    `
                  )
                  .join("")

              : `
                <div class="empty">
                  아직 저장된 작품이 없습니다.
                </div>
              `
          }

        </div>

      </main>

    </div>
  `;


  /* 로그아웃 */

  document
    .getElementById("logoutButton")
    .addEventListener(
      "click",
      async () => {

        try {

          await signOut(auth);

        } catch (error) {

          console.error(
            "Logout error:",
            error
          );

          alert(
            errorMessage(error)
          );

        }

      }
    );


  /* 새 작품 */

  document
    .getElementById("newButton")
    .addEventListener(
      "click",
      async () => {

        const book = {

          id: makeId(),

          title:
            "새로운 책 " +
            new Date()
              .toLocaleString("ko-KR")
              .replace(/[^0-9]/g, ""),

          chapters: [
            {
              id: makeId(),
              title: "1장",
              html: ""
            }
          ]

        };


        try {

          await saveBook(book);

          openEditor(book);

        } catch (error) {

          console.error(
            "Create book error:",
            error
          );

          alert(
            errorMessage(error)
          );

        }

      }
    );


  /* 기존 작품 */

  document
    .querySelectorAll(".work")
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          const book =
            books.find(
              item =>
                item.id ===
                element.dataset.id
            );


          if (book) {
            openEditor(book);
          }

        }
      );

    });
}


/* =========================================================
   에디터 선택 영역 복구
========================================================= */

function restoreSelection(editor) {

  if (!savedRange) {
    return false;
  }


  if (
    !editor.contains(
      savedRange.commonAncestorContainer
    )
  ) {
    return false;
  }


  const selection =
    window.getSelection();


  selection.removeAllRanges();

  selection.addRange(
    savedRange
  );

  editor.focus();


  return true;
}


/* =========================================================
   선택 영역 기억
========================================================= */

function rememberSelection(editor) {

  const selection =
    window.getSelection();


  if (
    !selection ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return;
  }


  const range =
    selection.getRangeAt(0);


  if (
    editor.contains(
      range.commonAncestorContainer
    )
  ) {

    savedRange =
      range.cloneRange();

  }
}


/* =========================================================
   명령 실행
========================================================= */

function runCommand(
  command,
  value = null
) {

  const editor =
    document.getElementById(
      "editor"
    );


  if (
    !editor ||
    !restoreSelection(editor)
  ) {

    alert(
      "먼저 적용할 글자를 드래그해서 선택해 주세요."
    );

    return;
  }


  document.execCommand(
    command,
    false,
    value
  );


  editor.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );
}


/* =========================================================
   스타일 적용
========================================================= */

function applyStyle(styleName) {

  const editor =
    document.getElementById(
      "editor"
    );


  if (
    !editor ||
    !restoreSelection(editor)
  ) {

    alert(
      "먼저 적용할 글자를 드래그해서 선택해 주세요."
    );

    return;
  }


  const selection =
    window.getSelection();


  if (
    !selection.rangeCount ||
    selection.isCollapsed
  ) {
    return;
  }


  const range =
    selection.getRangeAt(0);


  const span =
    document.createElement("span");


  span.className =
    "text-" + styleName;


  try {

    span.appendChild(
      range.extractContents()
    );


    range.insertNode(span);


    selection.removeAllRanges();


    const newRange =
      document.createRange();


    newRange.selectNodeContents(
      span
    );


    selection.addRange(
      newRange
    );


    savedRange =
      newRange.cloneRange();


    editor.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );

  } catch (error) {

    console.error(
      "Style error:",
      error
    );

  }
}


/* =========================================================
   에디터
========================================================= */

function openEditor(book) {

  let chapterIndex = 0;


  const render = () => {

    const chapter =
      book.chapters[chapterIndex];


    root.innerHTML = `
      <div class="editor-app">

        <aside class="side">

          <div class="side-logo">
            ✦ Book Writing
          </div>

          <button
            class="back"
            id="backButton"
            type="button"
          >
            ← 작품 목록
          </button>

          <button
            class="new-chapter"
            id="addChapterButton"
            type="button"
          >
            ＋ 새 챕터
          </button>

          <div class="label">
            목차
          </div>

          <div id="chapterList"></div>

        </aside>


        <main class="editor-main">

          <header class="top">

            <input
              class="project"
              id="projectTitle"
              value="${escapeHtml(book.title)}"
            >

            <span
              class="status"
              id="saveStatus"
            >
              자동 저장
            </span>

          </header>


          <section class="writing">

            <input
              class="chapter-title"
              id="chapterTitle"
              value="${escapeHtml(chapter.title)}"
            >


            <div class="toolbar">

              <button
                type="button"
                data-command="bold"
              >
                <b>B</b>
              </button>

              <button
                type="button"
                data-command="italic"
              >
                <i>I</i>
              </button>


              <span class="sep"></span>


              <button
                type="button"
                class="color"
                data-color="black"
              >
                검정
              </button>

              <button
                type="button"
                class="color"
                data-color="#8a3d3d"
              >
                빨강
              </button>

              <button
                type="button"
                class="color"
                data-color="#416b9a"
              >
                파랑
              </button>

              <button
                type="button"
                class="color"
                data-color="#7a659b"
              >
                보라
              </button>


              <span class="sep"></span>


              <button
                type="button"
                class="style-btn"
                data-style="title"
              >
                제목
              </button>

              <button
                type="button"
                class="style-btn"
                data-style="toc"
              >
                목차
              </button>

              <button
                type="button"
                class="style-btn"
                data-style="subtitle"
              >
                소제목
              </button>

              <button
                type="button"
                class="style-btn"
                data-style="content"
              >
                내용
              </button>

            </div>


            <div
              id="editor"
              class="editor"
              contenteditable="true"
              data-placeholder="여기에 이야기를 써보세요."
            >${chapter.html || ""}</div>

          </section>


          <div
            class="footer"
            id="characterCount"
          >
            0자
          </div>

        </main>

      </div>
    `;


    const chapterList =
      document.getElementById(
        "chapterList"
      );

    const editor =
      document.getElementById(
        "editor"
      );

    const status =
      document.getElementById(
        "saveStatus"
      );

    const characterCount =
      document.getElementById(
        "characterCount"
      );


    savedRange = null;


    /* 챕터 목록 */

    chapterList.innerHTML =
      book.chapters
        .map(
          (item, index) =>
            `
              <div
                class="chapter ${
                  index === chapterIndex
                    ? "active"
                    : ""
                }"
                data-index="${index}"
              >
                ${escapeHtml(
                  item.title ||
                  "챕터 " +
                    (index + 1)
                )}
              </div>
            `
        )
        .join("");


    /* 글자 수 */

    const updateCount = () => {

      characterCount.textContent =
        editor.innerText.length
          .toLocaleString() +
        "자";

    };


    /* 현재 챕터 저장 */

    const saveCurrentChapter = () => {

      chapter.html =
        editor.innerHTML;

    };


    /* 선택 영역 기억 */

    document.addEventListener(
      "selectionchange",
      () => rememberSelection(editor)
    );


    /* 챕터 이동 */

    document
      .querySelectorAll(".chapter")
      .forEach(element => {

        element.addEventListener(
          "click",
          () => {

            saveCurrentChapter();

            chapterIndex =
              Number(
                element.dataset.index
              );

            render();

          }
        );

      });


    /* 작품 목록으로 */

    document
      .getElementById("backButton")
      .addEventListener(
        "click",
        async () => {

          saveCurrentChapter();


          try {

            await saveBook(book);

            await dashboard();

          } catch (error) {

            console.error(
              "Back/save error:",
              error
            );

            alert(
              errorMessage(error)
            );

          }

        }
      );


    /* 새 챕터 */

    document
      .getElementById(
        "addChapterButton"
      )
      .addEventListener(
        "click",
        async () => {

          saveCurrentChapter();


          book.chapters.push({
            id: makeId(),
            title:
              (
                book.chapters.length +
                1
              ) + "장",
            html: ""
          });


          chapterIndex =
            book.chapters.length - 1;


          render();


          try {

            await saveBook(book);

          } catch (error) {

            console.error(
              "Add chapter save error:",
              error
            );

          }

        }
      );


    /* 작품 제목 */

    document
      .getElementById("projectTitle")
      .addEventListener(
        "input",
        event => {

          book.title =
            event.target.value;

          queueSave(
            book,
            status
          );

        }
      );


    /* 챕터 제목 */

    document
      .getElementById("chapterTitle")
      .addEventListener(
        "input",
        event => {

          chapter.title =
            event.target.value;


          const activeChapter =
            chapterList.querySelector(
              ".active"
            );


          if (activeChapter) {

            activeChapter.textContent =
              chapter.title ||
              "제목 없음";

          }


          queueSave(
            book,
            status
          );

        }
      );


    /* 본문 */

    editor.addEventListener(
      "input",
      () => {

        chapter.html =
          editor.innerHTML;


        updateCount();


        queueSave(
          book,
          status
        );

      }
    );


    /* 굵게 / 기울임 */

    document
      .querySelectorAll(
        "[data-command]"
      )
      .forEach(button => {

        button.addEventListener(
          "mousedown",
          event =>
            event.preventDefault()
        );


        button.addEventListener(
          "click",
          () =>
            runCommand(
              button.dataset.command
            )
        );

      });


    /* 글자색 */

    document
      .querySelectorAll(".color")
      .forEach(button => {

        button.addEventListener(
          "mousedown",
          event =>
            event.preventDefault()
        );


        button.addEventListener(
          "click",
          () =>
            runCommand(
              "foreColor",
              button.dataset.color
            )
        );

      });


    /* 제목/목차/소제목/내용 */

    document
      .querySelectorAll(".style-btn")
      .forEach(button => {

        button.addEventListener(
          "mousedown",
          event =>
            event.preventDefault()
        );


        button.addEventListener(
          "click",
          () =>
            applyStyle(
              button.dataset.style
            )
        );

      });


    updateCount();

  };


  render();
}


/* =========================================================
   Firebase Authentication 상태 감시
========================================================= */

onAuthStateChanged(
  auth,

  nextUser => {

    user = nextUser;


    if (user) {

      console.log(
        "로그인:",
        user.uid,
        user.email
      );

      dashboard();

    } else {

      console.log(
        "로그아웃 상태"
      );

      authScreen();

    }

  },

  error => {

    console.error(
      "Auth state error:",
      error
    );

    showFatalError(error);

  }
);
