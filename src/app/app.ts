import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('asset-issue-tracker');
  private particleInterval: any;

  ngOnInit() {
    this.createParticles();
  }

  ngOnDestroy() {
    if (this.particleInterval) {
      clearInterval(this.particleInterval);
    }
  }

  private createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    // Create initial particles with staggered timing
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.createParticle(particlesContainer);
      }, i * 100);
    }

    // Continuously create new particles
    this.particleInterval = setInterval(() => {
      this.createParticle(particlesContainer);
    }, 500);
  }

  private createParticle(container: HTMLElement) {
    const particle = document.createElement('div');
    
    // Random size class
    const sizes = ['small', 'medium', 'large'];
    const sizeClass = sizes[Math.floor(Math.random() * sizes.length)];
    
    // Random color class
    const colors = ['blue', 'pink', 'mint', 'coral'];
    const colorClass = colors[Math.floor(Math.random() * colors.length)];
    
    particle.className = `particle ${sizeClass} ${colorClass}`;
    
    // Random horizontal position
    particle.style.left = Math.random() * 100 + '%';
    
    // Random animation duration (15-25 seconds)
    particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
    
    // Random delay
    particle.style.animationDelay = Math.random() * 3 + 's';
    
    container.appendChild(particle);
    
    // Remove particle after animation completes
    const duration = parseFloat(particle.style.animationDuration) * 1000;
    const delay = parseFloat(particle.style.animationDelay) * 1000;
    
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, duration + delay);
  }
}
