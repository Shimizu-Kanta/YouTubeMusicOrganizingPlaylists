const STORAGE_CLIENT_ID_KEY = "ytmOrganizer.clientId";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";

const state = {
  isSignedIn: false,
  oauthClientId: localStorage.getItem(STORAGE_CLIENT_ID_KEY) ?? "",
  accessToken: "",
  selectedPlaylistId: null,
  playlists: [
    {
      id: "p1",
      title: "Morning Focus",
      tracks: [
        { id: "t1", title: "Night Owl", artist: "Galimatias" },
        { id: "t2", title: "Awake", artist: "Tycho" },
        { id: "t3", title: "Open", artist: "Rhye" },
      ],
    },
  ],
  searchPool: [
    { id: "s1", title: "Blinding Lights", artist: "The Weeknd" },
    { id: "s2", title: "Levitating", artist: "Dua Lipa" },
    { id: "s3", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars" },
    { id: "s4", title: "Happier Than Ever", artist: "Billie Eilish" },
  ],
};

const playlistListEl = document.getElementById("playlistList");
const playlistHintEl = document.getElementById("playlistHint");
const searchInputEl = document.getElementById("searchInput");
const searchBtnEl = document.getElementById("searchBtn");
const searchResultsEl = document.getElementById("searchResults");
const loginBtnEl = document.getElementById("loginBtn");
const loadPlaylistsBtnEl = document.getElementById("loadPlaylistsBtn");
const trackTemplate = document.getElementById("trackItemTemplate");
const clientIdInputEl = document.getElementById("clientIdInput");
const saveClientIdBtnEl = document.getElementById("saveClientIdBtn");
const authStatusEl = document.getElementById("authStatus");

clientIdInputEl.value = state.oauthClientId;

function setAuthStatus(message) {
  authStatusEl.textContent = message;
}

function selectedPlaylist() {
  return state.playlists.find((p) => p.id === state.selectedPlaylistId) ?? null;
}

function renderPlaylists() {
  playlistListEl.innerHTML = "";

  state.playlists.forEach((playlist) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = `playlist-button ${playlist.id === state.selectedPlaylistId ? "active" : ""}`;
    button.textContent = `${playlist.title} (${playlist.tracks.length})`;
    button.addEventListener("click", () => {
      state.selectedPlaylistId = playlist.id;
      renderPlaylists();
      renderTracks();
    });
    li.appendChild(button);
    playlistListEl.appendChild(li);
  });

  playlistHintEl.textContent = state.selectedPlaylistId
    ? "ドラッグ＆ドロップで楽曲順を変更できます。"
    : "プレイリストを選択すると、ここに楽曲一覧が表示されます。";
}

function renderTracks() {
  const selected = selectedPlaylist();

  const oldTrackList = document.querySelector(".track-list");
  if (oldTrackList) oldTrackList.remove();

  if (!selected) return;

  const ul = document.createElement("ul");
  ul.className = "track-list";

  selected.tracks.forEach((track, index) => {
    const node = trackTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.trackId = track.id;

    node.querySelector(".track-title").textContent = track.title;
    node.querySelector(".track-artist").textContent = track.artist;

    node.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
    });

    node.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    node.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
      const targetIndex = index;
      reorderTrack(sourceIndex, targetIndex);
    });

    node.querySelector(".remove-btn").addEventListener("click", () => {
      removeTrack(track.id);
    });

    ul.appendChild(node);
  });

  playlistListEl.insertAdjacentElement("afterend", ul);
}

function reorderTrack(sourceIndex, targetIndex) {
  if (sourceIndex === targetIndex) return;
  const selected = selectedPlaylist();
  if (!selected) return;

  const [moved] = selected.tracks.splice(sourceIndex, 1);
  selected.tracks.splice(targetIndex, 0, moved);

  renderPlaylists();
  renderTracks();
}

function removeTrack(trackId) {
  const selected = selectedPlaylist();
  if (!selected) return;

  selected.tracks = selected.tracks.filter((t) => t.id !== trackId);
  renderPlaylists();
  renderTracks();
}

function addTrack(track) {
  const selected = selectedPlaylist();
  if (!selected) {
    alert("先にサイドバーからプレイリストを選択してください。");
    return;
  }

  const exists = selected.tracks.some((t) => t.title === track.title && t.artist === track.artist);
  if (exists) {
    alert("この楽曲は既にプレイリストに追加されています。");
    return;
  }

  selected.tracks.push({
    id: `track-${Date.now()}`,
    title: track.title,
    artist: track.artist,
  });

  renderPlaylists();
  renderTracks();
}

function renderSearchResults(keyword = "") {
  const lowerKeyword = keyword.toLowerCase();
  const filtered = state.searchPool.filter((song) => {
    if (!lowerKeyword) return true;
    return song.title.toLowerCase().includes(lowerKeyword) || song.artist.toLowerCase().includes(lowerKeyword);
  });

  searchResultsEl.innerHTML = "";

  filtered.forEach((song) => {
    const li = document.createElement("li");
    li.className = "search-item";

    const info = document.createElement("div");
    info.innerHTML = `<p class="track-title">${song.title}</p><p class="track-artist">${song.artist}</p>`;

    const addButton = document.createElement("button");
    addButton.className = "secondary";
    addButton.textContent = "追加";
    addButton.addEventListener("click", () => addTrack(song));

    li.append(info, addButton);
    searchResultsEl.appendChild(li);
  });
}

function saveClientId() {
  const clientId = clientIdInputEl.value.trim();
  if (!clientId) {
    alert("Client IDを入力してください。");
    return;
  }

  state.oauthClientId = clientId;
  localStorage.setItem(STORAGE_CLIENT_ID_KEY, clientId);
  setAuthStatus("Client IDを保存しました。ログインできます。");
}

function requestAccessToken() {
  if (!state.oauthClientId) {
    alert("先にClient IDを保存してください。");
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    setAuthStatus("Google Identity Servicesの読み込みに失敗しました。");
    return;
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: state.oauthClientId,
    scope: YOUTUBE_SCOPE,
    callback: (response) => {
      if (response.error) {
        setAuthStatus(`ログイン失敗: ${response.error}`);
        return;
      }
      state.accessToken = response.access_token;
      state.isSignedIn = true;
      loginBtnEl.textContent = "ログイン済み";
      setAuthStatus("ログイン成功。プレイリスト取得が可能です。");
    },
  });

  tokenClient.requestAccessToken({ prompt: "consent" });
}

async function fetchPlaylistsFromYouTube() {
  if (!state.accessToken) {
    alert("先にGoogleログインしてください。");
    return;
  }

  setAuthStatus("プレイリストを取得中...");
  const endpoint = "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50";

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    setAuthStatus(`取得失敗: HTTP ${response.status}`);
    console.error(errorBody);
    return;
  }

  const data = await response.json();
  state.playlists = (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.snippet?.title ?? "Untitled",
    tracks: [],
  }));

  state.selectedPlaylistId = state.playlists[0]?.id ?? null;
  renderPlaylists();
  renderTracks();
  setAuthStatus(`プレイリスト取得成功: ${state.playlists.length}件`);
}

saveClientIdBtnEl.addEventListener("click", saveClientId);
loginBtnEl.addEventListener("click", requestAccessToken);
loadPlaylistsBtnEl.addEventListener("click", fetchPlaylistsFromYouTube);

searchBtnEl.addEventListener("click", () => {
  renderSearchResults(searchInputEl.value);
});

searchInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") renderSearchResults(searchInputEl.value);
});

if (state.oauthClientId) {
  setAuthStatus("保存済みClient IDを読み込みました。ログインできます。");
}

renderPlaylists();
renderSearchResults();
