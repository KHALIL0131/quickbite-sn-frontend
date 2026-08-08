import { environment } from '../../../environments/environment';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-messagerie',
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.html',
  styleUrl: './messagerie.scss'
})
export class Messagerie implements OnInit, OnDestroy {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  utilisateur: any = null;
  nouveauMessage = '';
  searchQuery = '';
  conversationActive: any = null;
  estEnTrainEcrire = false;
  interlocuteurEcrit = false;

  conversations: any[] = [];
  messages: any[] = [];
  loading = false;
  loadingMessages = false;

  // MESSAGE SÉLECTIONNÉ POUR MODIFIER/SUPPRIMER
  messageSelectionne: any = null;
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  modeEdition = false;
  texteEdition = '';

  private socket!: Socket;
  private typingTimeout: any = null;
  private apiUrl = environment.apiUrl;

 constructor(public router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.connecterSocket();
    this.chargerConversations();
    document.addEventListener('click', () => this.fermerContextMenu());
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    document.removeEventListener('click', () => this.fermerContextMenu());
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (user) this.utilisateur = JSON.parse(user);
  }

  connecterSocket() {
    this.socket = io(environment.socketUrl, { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      console.log('✅ Socket connecté');
      if (this.utilisateur) {
        this.socket.emit('rejoindre', this.utilisateur.id);
      }
    });

    // Nouveau message reçu
    this.socket.on('nouveau_message', (msg: any) => {
      if (this.conversationActive &&
          msg.commande_id == this.conversationActive.commande_id) {
        this.messages.push(msg);
        // Marquer comme lu
        this.socket.emit('marquer_lu', {
          commande_id: this.conversationActive.commande_id,
          destinataire_id: this.utilisateur.id,
          expediteur_id: this.conversationActive.interlocuteur_id
        });
        this.cdr.detectChanges();
        setTimeout(() => this.scrollBas(), 50);
      }
      // Mettre à jour la conversation dans la liste
      const conv = this.conversations.find(c => c.commande_id == msg.commande_id);
      if (conv) {
        conv.dernier_message = msg.texte;
        if (msg.expediteur_id !== this.utilisateur.id &&
            this.conversationActive?.commande_id !== msg.commande_id) {
          conv.non_lus = (conv.non_lus || 0) + 1;
        }
      }
      this.cdr.detectChanges();
    });

    // Message modifié
    this.socket.on('message_modifie', (data: any) => {
      const msg = this.messages.find(m => m.id === data.id);
      if (msg) {
        msg.texte = data.texte;
        msg.est_modifie = true;
        this.cdr.detectChanges();
      }
    });

    // Message supprimé
    this.socket.on('message_supprime', (data: any) => {
      const idx = this.messages.findIndex(m => m.id === data.id);
      if (idx !== -1) {
        this.messages[idx].est_supprime = true;
        this.messages[idx].texte = 'Message supprimé';
        this.cdr.detectChanges();
      }
    });

    // Messages lus
    this.socket.on('messages_lus', (data: any) => {
      this.messages.forEach(m => {
        if (m.commande_id == data.commande_id &&
            m.expediteur_id == this.utilisateur.id) {
          m.est_lu = true;
        }
      });
      this.cdr.detectChanges();
    });

    // Interlocuteur écrit
    this.socket.on('est_en_train_ecrire', (data: any) => {
      if (this.conversationActive &&
          data.commande_id == this.conversationActive.commande_id) {
        this.interlocuteurEcrit = true;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollBas(), 50);
      }
    });

    this.socket.on('arret_ecriture', () => {
      this.interlocuteurEcrit = false;
      this.cdr.detectChanges();
    });
  }

  chargerConversations() {
    if (!this.utilisateur) return;
    this.loading = true;

    fetch(`${this.apiUrl}/messages/conversations/${this.utilisateur.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.conversations = data.data || [];
          if (this.conversations.length > 0) {
            this.selectionnerConversation(this.conversations[0]);
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      }).catch(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  selectionnerConversation(conv: any) {
    this.conversationActive = conv;
    conv.non_lus = 0;
    this.messages = [];
    this.loadingMessages = true;
    this.modeEdition = false;
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/messages/${conv.commande_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) this.messages = data.data || [];
        this.loadingMessages = false;
        this.cdr.detectChanges();

        // Marquer comme lus
        this.socket.emit('marquer_lu', {
          commande_id: conv.commande_id,
          destinataire_id: this.utilisateur.id,
          expediteur_id: conv.interlocuteur_id
        });

        setTimeout(() => this.scrollBas(), 100);
      }).catch(() => {
        this.loadingMessages = false;
        this.cdr.detectChanges();
      });
  }

  envoyerMessage() {
    const texte = this.modeEdition ? this.texteEdition : this.nouveauMessage;
    if (!texte.trim() || !this.conversationActive) return;

    if (this.modeEdition && this.messageSelectionne) {
      // MODIFIER
      this.socket.emit('modifier_message', {
        message_id: this.messageSelectionne.id,
        nouveau_texte: this.texteEdition,
        expediteur_id: this.utilisateur.id,
        destinataire_id: this.conversationActive.interlocuteur_id
      });
      this.annulerEdition();
    } else {
      // ENVOYER NOUVEAU
      this.socket.emit('envoyer_message', {
        commande_id: this.conversationActive.commande_id,
        expediteur_id: this.utilisateur.id,
        destinataire_id: this.conversationActive.interlocuteur_id,
        texte: texte.trim()
      });
      this.nouveauMessage = '';
    }

    // Arrêter indicateur d'écriture
    this.socket.emit('arret_ecriture', {
      destinataire_id: this.conversationActive.interlocuteur_id,
      expediteur_id: this.utilisateur.id
    });

    this.cdr.detectChanges();
  }

  onInput() {
    if (!this.conversationActive) return;

    this.socket.emit('en_train_ecrire', {
      expediteur_id: this.utilisateur.id,
      destinataire_id: this.conversationActive.interlocuteur_id,
      commande_id: this.conversationActive.commande_id
    });

    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('arret_ecriture', {
        destinataire_id: this.conversationActive.interlocuteur_id,
        expediteur_id: this.utilisateur.id
      });
    }, 2000);
  }

  onKeyEnter(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.envoyerMessage();
    }
  }

  // CONTEXT MENU — CLIC DROIT
  ouvrirContextMenu(event: MouseEvent, msg: any) {
    event.preventDefault();
    event.stopPropagation();
    if (msg.expediteur_id !== this.utilisateur.id) return;
    if (msg.est_supprime) return;

    this.messageSelectionne = msg;
    this.showContextMenu = true;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.cdr.detectChanges();
  }

  fermerContextMenu() {
    this.showContextMenu = false;
    this.cdr.detectChanges();
  }

  commencerEdition() {
    if (!this.messageSelectionne) return;
    this.modeEdition = true;
    this.texteEdition = this.messageSelectionne.texte;
    this.showContextMenu = false;
    this.cdr.detectChanges();
  }

  annulerEdition() {
    this.modeEdition = false;
    this.texteEdition = '';
    this.messageSelectionne = null;
    this.cdr.detectChanges();
  }

  supprimerMessage() {
    if (!this.messageSelectionne || !this.conversationActive) return;
    this.socket.emit('supprimer_message', {
      message_id: this.messageSelectionne.id,
      expediteur_id: this.utilisateur.id,
      destinataire_id: this.conversationActive.interlocuteur_id
    });
    this.showContextMenu = false;
    this.messageSelectionne = null;
    this.cdr.detectChanges();
  }

  scrollBas() {
    if (this.messagesEnd?.nativeElement) {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  estMonMessage(msg: any): boolean {
    return msg.expediteur_id === this.utilisateur?.id;
  }

  get totalNonLus(): number {
    return this.conversations.reduce((s, c) => s + (c.non_lus || 0), 0);
  }

  get conversationsFiltrees(): any[] {
    if (!this.searchQuery) return this.conversations;
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c =>
      (c.nom + ' ' + c.prenom).toLowerCase().includes(q) ||
      c.dernier_message?.toLowerCase().includes(q)
    );
  }

  getInitiales(u?: any): string {
    const user = u || this.utilisateur;
    if (!user) return '?';
    return ((user.prenom?.[0] || '') + (user.nom?.[0] || '')).toUpperCase();
  }

  formaterHeure(d: string): string {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (jours === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (jours === 1) return 'Hier';
    if (jours < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToPanier() { this.router.navigate(['/panier']); }
}