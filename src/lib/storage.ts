import { Project, MemberSubmission, STORAGE_KEYS } from './types';

class StorageService {
  constructor() {
    // Initialize storage if empty
    if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  private setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      
      // Check if the data would exceed localStorage limits
      const currentSize = new Blob([serialized]).size;
      const maxSize = 4.5 * 1024 * 1024; // 4.5MB limit to be safe
      
      if (currentSize > maxSize) {
        console.warn('Data size exceeds localStorage limits, attempting to clean up...');
        this.cleanupStorage();
        
        // Try again after cleanup
        const newSize = new Blob([serialized]).size;
        if (newSize > maxSize) {
          throw new Error('Data still too large after cleanup');
        }
      }
      
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  }

  private cleanupStorage(): void {
    try {
      // Remove old projects to free up space
      const projects = this.getItem<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      if (projects.length > 10) {
        // Keep only the 10 most recent projects
        const sortedProjects = projects.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const recentProjects = sortedProjects.slice(0, 10);
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(recentProjects));
      }
    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
  }

  private initializeProject(project: Partial<Project>): Project {
    return {
      id: project.id || this.generateId(),
      name: project.groupName || project.name || '',
      year: project.year || '',
      createdAt: project.createdAt || new Date().toISOString(),
      totalMembers: project.memberCount || project.totalMembers || 0,
      submittedMembers: project.submittedMembers || 0,
      gridType: project.gridStyle || project.gridType || 'hexagonal',
      status: project.status || 'active',
      groupName: project.groupName || project.name || '',
      occasion: project.occasion || '',
      memberCount: project.memberCount || project.totalMembers || 0,
      gridStyle: project.gridStyle || project.gridType || 'hexagonal',
      schoolLogo: project.schoolLogo || undefined,
      submissions: project.submissions || [],
      votes: project.votes || {
        hexagonal: 0,
        square: 0,
        circular: 0
      }
    };
  }

  // Project Methods
  getProjects(): Project[] {
    const projects = this.getItem<Project[]>(STORAGE_KEYS.PROJECTS) || [];
    return projects.map(project => this.initializeProject(project));
  }

  getProject(projectId: string): Project | null {
    const projects = this.getProjects();
    const project = projects.find(p => p.id === projectId);
    return project ? this.initializeProject(project) : null;
  }

  saveProject(project: Partial<Project>): boolean {
    try {
      const projects = this.getProjects();
      const initializedProject = this.initializeProject(project);
      const existingIndex = projects.findIndex(p => p.id === initializedProject.id);
      
      if (existingIndex >= 0) {
        projects[existingIndex] = initializedProject;
      } else {
        projects.push(initializedProject);
      }
      
      return this.setItem(STORAGE_KEYS.PROJECTS, projects);
    } catch (error) {
      console.error('Error saving project:', error);
      return false;
    }
  }

  // Submission Methods
  getSubmissions(projectId: string): MemberSubmission[] {
    const project = this.getProject(projectId);
    return project?.submissions || [];
  }

  saveSubmission(submission: MemberSubmission): boolean {
    try {
      const project = this.getProject(submission.projectId);
      if (!project) return false;

      const submissions = project.submissions || [];
      const existingIndex = submissions.findIndex(s => s.id === submission.id);
      
      if (existingIndex >= 0) {
        submissions[existingIndex] = submission;
      } else {
        submissions.push(submission);
      }
      
      project.submissions = submissions;
      return this.saveProject(project);
    } catch (error) {
      console.error('Error saving submission:', error);
      return false;
    }
  }

  // Vote Methods
  updateVotes(projectId: string, style: keyof Project['votes']): boolean {
    try {
      const project = this.getProject(projectId);
      if (!project) return false;

      project.votes[style]++;
      return this.saveProject(project);
    } catch (error) {
      console.error('Error updating votes:', error);
      return false;
    }
  }

  // Helper Methods
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        
        // Compress the image if it's too large
        if (result.length > 500000) { // 500KB limit
          this.compressImage(result).then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      };
      reader.onerror = error => reject(error);
    });
  }

  private compressImage(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 800px width/height)
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with reduced quality
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = base64;
    });
  }

  // Clear all data (useful for testing)
  clearAll(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Delete a specific project
  deleteProject(projectId: string): boolean {
    try {
      const projects = this.getProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      return this.setItem(STORAGE_KEYS.PROJECTS, filteredProjects);
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      const projects = this.getItem<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      const serialized = JSON.stringify(projects);
      const used = new Blob([serialized]).size;
      const available = 4.5 * 1024 * 1024; // 4.5MB
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}

export const storageService = new StorageService(); 