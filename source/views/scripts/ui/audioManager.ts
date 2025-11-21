import { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { playTrack } from "../utils/agoraActions";

interface AudioFile {
  id: string;
  name: string;
  path: string;
  originalName: string;
}

class AudioManager {
  private audioFiles: AudioFile[] = [];
  private rtcClient: IAgoraRTCClient | null = null;
  private isUploading: boolean = false;
  private selectedAudioFile: AudioFile | null = null;

  constructor(rtcClient?: IAgoraRTCClient | null) {
    this.rtcClient = rtcClient || null;
    this.loadAudioFiles();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeEventListeners();
      });
    } else {
      this.initializeEventListeners();
    }
  }

  private initializeEventListeners(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // アップロードボタンのイベントリスナー
    const uploadBtn = document.getElementById('uploadAudioBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAudioUpload();
      });
      console.log('Upload button event listener attached');
    } else {
      console.warn('Upload button not found, will retry on next DOMContentLoaded');
    }

    // ファイル選択時のイベントリスナー
    const fileInput = document.getElementById('audioFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
      console.log('File input event listener attached');
    } else {
      console.warn('File input not found, will retry on next DOMContentLoaded');
    }
  }

  private async handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const fileNameInput = document.getElementById('audioFileName') as HTMLInputElement;
      if (fileNameInput && !fileNameInput.value) {
        // ファイル名を自動設定（拡張子を除く）
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        fileNameInput.value = nameWithoutExt;
      }
    }
  }

  private async handleAudioUpload(): Promise<void> {
    if (this.isUploading) {
      return; // アップロード中は重複実行を防ぐ
    }

    const fileInput = document.getElementById('audioFileInput') as HTMLInputElement;
    const fileNameInput = document.getElementById('audioFileName') as HTMLInputElement;
    const uploadBtn = document.getElementById('uploadAudioBtn') as HTMLButtonElement;
    
    const file = fileInput.files?.[0];
    const fileName = fileNameInput.value.trim();

    if (!file) {
      this.showStatus('ファイルを選択してください', 'error');
      return;
    }

    if (!fileName) {
      this.showStatus('ファイル名を入力してください', 'error');
      return;
    }

    // 同じ名前のファイルが既に存在するかチェック
    const existingFile = this.audioFiles.find(audioFile => audioFile.name === fileName);
    if (existingFile) {
      this.showStatus('同じ名前のファイルが既に存在します。別の名前を入力してください。', 'error');
      return;
    }

    // ファイルサイズチェック（制限なしだが、警告は表示）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const confirmUpload = confirm(`ファイルサイズが大きいです（${(file.size / 1024 / 1024).toFixed(1)}MB）。アップロードしますか？`);
      if (!confirmUpload) return;
    }

    try {
      this.isUploading = true;
      this.showUploadProgress();
      this.disableUploadButton(uploadBtn);
      
      const formData = new FormData();
      formData.append('audioFile', file);
      formData.append('fileName', fileName);

      const response = await fetch('/api/sound-api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('アップロードに失敗しました');
      }

      const result = await response.json();
      
      if (result.success) {
        this.showStatus('アップロード完了！', 'success');
        this.addAudioFile(result.audioFile);
        
        // フォームをリセット
        fileInput.value = '';
        fileNameInput.value = '';
      } else {
        throw new Error(result.message || 'アップロードに失敗しました');
      }
    } catch (error) {
      console.error('Audio upload error:', error);
      this.showStatus(`エラー: ${error instanceof Error ? error.message : 'アップロードに失敗しました'}`, 'error');
    } finally {
      this.isUploading = false;
      this.hideUploadProgress();
      this.enableUploadButton(uploadBtn);
    }
  }

  private showUploadProgress(): void {
    const uploadForm = document.querySelector('.upload-form');
    if (!uploadForm) return;

    // 既存のプログレスバーを削除
    const existingProgress = uploadForm.querySelector('.upload-progress');
    if (existingProgress) {
      existingProgress.remove();
    }

    // プログレスバーを作成
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress';
    progressContainer.innerHTML = `
      <div class="upload-progress-bar" style="width: 0%"></div>
    `;
    uploadForm.appendChild(progressContainer);

    // プログレスバーをアニメーション
    const progressBar = progressContainer.querySelector('.upload-progress-bar') as HTMLElement;
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressBar.style.width = `${progress}%`;
    }, 200);

    // プログレスバーの参照を保存
    (progressContainer as any).interval = interval;
  }

  private hideUploadProgress(): void {
    const progressContainer = document.querySelector('.upload-progress');
    if (progressContainer) {
      const interval = (progressContainer as any).interval;
      if (interval) {
        clearInterval(interval);
      }
      
      const progressBar = progressContainer.querySelector('.upload-progress-bar') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = '100%';
      }

      // 少し待ってから削除
      setTimeout(() => {
        progressContainer.remove();
      }, 500);
    }
  }

  private disableUploadButton(button: HTMLButtonElement): void {
    button.disabled = true;
    button.textContent = 'アップロード中...';
    button.style.opacity = '0.6';
  }

  private enableUploadButton(button: HTMLButtonElement): void {
    button.disabled = false;
    button.textContent = 'アップロード';
    button.style.opacity = '1';
  }

  private async loadAudioFiles(): Promise<void> {
    try {
      const response = await fetch('/api/sound-api/list');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.audioFiles = result.audioFiles;
          this.renderAudioFilesList();
        }
      }
    } catch (error) {
      console.error('Failed to load audio files:', error);
    }
  }

  private addAudioFile(audioFile: AudioFile): void {
    this.audioFiles.push(audioFile);
    this.renderAudioFilesList();
  }

  private renderAudioFilesList(): void {
    const audioFilesList = document.getElementById('audioFilesList');
    if (!audioFilesList) return;

    audioFilesList.innerHTML = '';

    if (this.audioFiles.length === 0) {
      audioFilesList.innerHTML = '<div class="col-12"><p class="text-muted text-center">保存された音声ファイルがありません</p></div>';
      return;
    }

    // デフォルトに戻すボタンを追加
    const defaultButtonContainer = document.createElement('div');
    defaultButtonContainer.className = 'col-12 mb-3';
    defaultButtonContainer.innerHTML = `
      <div class="default-audio-section">
        <button class="btn-default-audio ${!this.selectedAudioFile ? 'selected' : ''}" onclick="audioManager.selectDefaultAudio()">
          ${!this.selectedAudioFile ? '✓デフォルト選択中' : 'デフォルトに戻す'}
        </button>
        <span class="default-audio-label">デフォルト: second.m4a</span>
      </div>
    `;
    audioFilesList.appendChild(defaultButtonContainer);

    this.audioFiles.forEach(audioFile => {
      const isSelected = this.selectedAudioFile && this.selectedAudioFile.id === audioFile.id;
      const audioFileElement = document.createElement('div');
      audioFileElement.className = 'col-md-6 col-lg-4 mb-3';
      audioFileElement.innerHTML = `
        <div class="audio-file-item ${isSelected ? 'selected' : ''}">
          <div class="audio-file-info">
            <div class="audio-file-name">${audioFile.name}</div>
            <div class="audio-file-path">${audioFile.originalName}</div>
            ${isSelected ? '<div class="selection-badge">選択中</div>' : ''}
          </div>
          <div class="audio-file-actions">
            <button class="btn-select-audio ${isSelected ? 'selected' : ''}" onclick="audioManager.selectAudioFile('${audioFile.id}')">
              ${isSelected ? '✓ 選択済み' : '📁 選択'}
            </button>
            <button class="btn-delete-audio" onclick="audioManager.deleteAudioFile('${audioFile.id}')">
              🗑️ 削除
            </button>
          </div>
        </div>
      `;
      audioFilesList.appendChild(audioFileElement);
    });
  }

  public selectAudioFile(audioFileId: string): void {
    console.log('=== 音声ファイル選択開始 ===');
    console.log('Selecting audio file ID:', audioFileId);
    console.log('Available audio files:', this.audioFiles);
    
    const audioFile = this.audioFiles.find(file => file.id === audioFileId);
    if (audioFile) {
      console.log('Found audio file:', audioFile);
      this.selectedAudioFile = audioFile;
      this.renderAudioFilesList();
      this.showStatus(`「${audioFile.name}」を選択しました`, 'success');
      console.log('Selected audio file set:', this.selectedAudioFile);
      console.log('Current selected audio file:', this.getSelectedAudioFile());
    } else {
      console.error('Audio file not found for ID:', audioFileId);
      this.showStatus('音声ファイルが見つかりませんでした', 'error');
    }
    console.log('=== 音声ファイル選択完了 ===');
  }

  public getSelectedAudioFile(): AudioFile | null {
    console.log('Getting selected audio file:', this.selectedAudioFile);
    return this.selectedAudioFile;
  }

  public async playAudio(audioPath: string): Promise<void> {
    if (!this.rtcClient) {
      console.warn('RTC client not available, audio playback disabled');
      this.showStatus('音声再生は接続後に利用可能です', 'error');
      return;
    }

    try {
      await playTrack(audioPath, false, 1000, this.rtcClient);
      this.showStatus('音声を再生しました', 'success');
    } catch (error) {
      console.error('Play audio error:', error);
      this.showStatus('音声の再生に失敗しました', 'error');
    }
  }

  private showStatus(message: string, type: 'success' | 'error' | 'uploading'): void {
    const statusElement = document.querySelector('.upload-status') || this.createStatusElement();
    
    statusElement.textContent = message;
    statusElement.className = `upload-status status-${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusElement.textContent = '';
      }, 3000);
    }
  }

  private createStatusElement(): HTMLElement {
    const uploadForm = document.querySelector('.upload-form');
    if (!uploadForm) return document.createElement('div');

    const statusElement = document.createElement('div');
    statusElement.className = 'upload-status';
    uploadForm.appendChild(statusElement);
    return statusElement;
  }

  public deleteAudioFile(audioFileId: string): void {
    this.deleteAudioFileInternal(audioFileId);
  }

  private async deleteAudioFileInternal(audioFileId: string): Promise<void> {
    try {
      const response = await fetch(`/api/sound-api/delete/${audioFileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 選択されたファイルが削除される場合は選択を解除
          if (this.selectedAudioFile && this.selectedAudioFile.id === audioFileId) {
            this.selectedAudioFile = null;
          }
          
          this.audioFiles = this.audioFiles.filter(file => file.id !== audioFileId);
          this.renderAudioFilesList();
          this.showStatus('ファイルを削除しました', 'success');
        } else {
          throw new Error(result.message || '削除に失敗しました');
        }
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete audio file error:', error);
      this.showStatus(`削除エラー: ${error instanceof Error ? error.message : '削除に失敗しました'}`, 'error');
    }
  }

  // カスタム音声ファイルのリストを取得（kuso.tsで使用）
  public getCustomAudioFiles(): AudioFile[] {
    return this.audioFiles;
  }

  // RTCClientを後から設定するメソッド
  public setRTCClient(rtcClient: IAgoraRTCClient): void {
    console.log('=== RTCClient設定開始 ===');
    console.log('Previous RTCClient:', this.rtcClient);
    console.log('New RTCClient:', rtcClient);
    this.rtcClient = rtcClient;
    console.log('RTCClient set for AudioManager');
    console.log('Current RTCClient:', this.rtcClient);
    console.log('=== RTCClient設定完了 ===');
  }

  // デバッグ用：現在の状態を確認
  public debugStatus(): void {
    console.log('=== AudioManager デバッグ情報 ===');
    console.log('RTCClient:', this.rtcClient);
    console.log('Selected Audio File:', this.selectedAudioFile);
    console.log('Audio Files Count:', this.audioFiles.length);
    console.log('Audio Files:', this.audioFiles);
    console.log('Is Uploading:', this.isUploading);
    console.log('=== デバッグ情報完了 ===');
  }

  public selectDefaultAudio(): void {
    console.log('=== デフォルト音声選択開始 ===');
    console.log('Previous selected audio:', this.selectedAudioFile);
    this.selectedAudioFile = null;
    this.renderAudioFilesList();
    this.showStatus('デフォルト音声（second.m4a）に戻しました', 'success');
    console.log('Default audio selected, current selection:', this.selectedAudioFile);
    console.log('=== デフォルト音声選択完了 ===');
  }
}

// グローバルインスタンス
let audioManager: AudioManager;

export function initializeAudioManager(rtcClient?: IAgoraRTCClient | null): void {
  audioManager = new AudioManager(rtcClient);
  
  // グローバルスコープに公開（HTMLから呼び出すため）
  (window as any).audioManager = audioManager;
  (window as any).initializeAudioManager = initializeAudioManager;
  (window as any).debugAudioManager = () => audioManager.debugStatus();
  
  console.log('AudioManager initialized and exposed to global scope');
  console.log('Available global methods: audioManager, initializeAudioManager, debugAudioManager');
}
