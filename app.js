// ========================================
// EduAI Pro - Production JavaScript
// Intelligent Teaching Assistant Platform
// ========================================

class EduAIPro {
    constructor() {
        this.currentUser = null;
        this.currentProject = null;
        this.data = {
            classes: [],
            projects: [],
            knowledge: [],
            students: [],
            rules: {
                global: '',
                classes: {},
                projects: {}
            },
            conversations: {},
            activity: []
        };
        
        this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    
    init() {
        this.loadData();
        if (this.data.classes.length === 0) {
            this.createDemoData();
        }
        this.checkAuth();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-resize textarea
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }
        });

        // Enter to send message (Shift+Enter for new line)
        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'student-input' && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    // ========================================
    // DATA MANAGEMENT
    // ========================================
    
    loadData() {
        const saved = localStorage.getItem('eduai_pro_data');
        if (saved) {
            this.data = JSON.parse(saved);
        }
    }

    saveData() {
        localStorage.setItem('eduai_pro_data', JSON.stringify(this.data));
    }

    // ========================================
    // AUTHENTICATION
    // ========================================
    
    checkAuth() {
        const saved = localStorage.getItem('eduai_pro_user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            if (this.currentUser.type === 'teacher') {
                this.loadTeacherDashboard();
            } else {
                this.loadStudentDashboard();
            }
        } else {
            this.showScreen('welcome-screen');
        }
    }

    showLogin(type) {
        this.showScreen(`${type}-login`);
    }

    teacherLogin(e) {
        e.preventDefault();
        const email = document.getElementById('teacher-email').value;
        
        this.currentUser = {
            type: 'teacher',
            email,
            name: email.split('@')[0],
            id: this.generateId()
        };
        
        localStorage.setItem('eduai_pro_user', JSON.stringify(this.currentUser));
        this.loadTeacherDashboard();
    }

    studentLogin(e) {
        e.preventDefault();
        const name = document.getElementById('student-name').value;
        const code = document.getElementById('class-code').value.toUpperCase();
        
        const classData = this.data.classes.find(c => c.code === code);
        if (!classData) {
            this.showToast('Invalid class code', 'error');
            return;
        }
        
        let student = this.data.students.find(s => s.name === name && s.classCode === code);
        if (!student) {
            student = {
                id: this.generateId(),
                name,
                classCode: code,
                classId: classData.id,
                className: classData.name,
                joinedAt: new Date().toISOString()
            };
            this.data.students.push(student);
            this.saveData();
            
            this.logActivity({
                type: 'student_joined',
                classId: classData.id,
                studentName: name,
                timestamp: new Date().toISOString()
            });
        }
        
        this.currentUser = {
            type: 'student',
            ...student
        };
        
        localStorage.setItem('eduai_pro_user', JSON.stringify(this.currentUser));
        this.loadStudentDashboard();
    }

    logout() {
        this.currentUser = null;
        this.currentProject = null;
        localStorage.removeItem('eduai_pro_user');
        this.showScreen('welcome-screen');
    }

    // ========================================
    // SCREEN MANAGEMENT
    // ========================================
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    // ========================================
    // TEACHER DASHBOARD
    // ========================================
    
    loadTeacherDashboard() {
        document.getElementById('teacher-name-display').textContent = this.currentUser.name;
        this.showScreen('teacher-dashboard');
        this.updateStats();
        this.renderOverview();
        this.populateDropdowns();
    }

    switchTab(tabName) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.nav-item').classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Load content
        switch(tabName) {
            case 'overview':
                this.renderOverview();
                break;
            case 'classes':
                this.renderClasses();
                break;
            case 'projects':
                this.renderProjects();
                break;
            case 'knowledge':
                this.renderKnowledge();
                break;
            case 'ai-config':
                this.loadAIConfig();
                break;
            case 'students':
                this.renderStudents();
                break;
        }
    }

    updateStats() {
        document.getElementById('stat-classes').textContent = this.data.classes.length;
        document.getElementById('stat-students').textContent = this.data.students.length;
        document.getElementById('stat-projects').textContent = this.data.projects.length;
        document.getElementById('stat-knowledge').textContent = this.data.knowledge.length;
    }

    renderOverview() {
        // Recent classes
        const recentClasses = this.data.classes.slice(-3).reverse();
        const classesHtml = recentClasses.length > 0 ? recentClasses.map(cls => {
            const studentCount = this.data.students.filter(s => s.classId === cls.id).length;
            return `
                <div style="padding: 1rem; background: var(--gray-50); border-radius: var(--radius-md); margin-bottom: 0.5rem;">
                    <div style="font-weight: 600; color: var(--gray-900);">${cls.name}</div>
                    <div style="font-size: 0.875rem; color: var(--gray-600); margin-top: 0.25rem;">
                        ${studentCount} students • Code: ${cls.code}
                    </div>
                </div>
            `;
        }).join('') : '<div class="empty-state"><p>No classes yet</p></div>';
        
        document.getElementById('recent-classes').innerHTML = classesHtml;
        
        // Recent activity
        const recentActivity = this.data.activity.slice(-5).reverse();
        const activityHtml = recentActivity.length > 0 ? recentActivity.map(act => {
            let icon = '📝';
            let text = '';
            
            if (act.type === 'student_joined') {
                icon = '👋';
                text = `${act.studentName} joined the class`;
            } else if (act.type === 'knowledge_added') {
                icon = '🧠';
                text = 'New knowledge item added';
            } else if (act.type === 'project_created') {
                icon = '📁';
                text = `Project "${act.projectName}" created`;
            }
            
            return `
                <div style="padding: 1rem; background: var(--gray-50); border-radius: var(--radius-md); margin-bottom: 0.5rem; display: flex; gap: 0.75rem; align-items: start;">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-size: 0.875rem; color: var(--gray-700);">${text}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">
                            ${this.formatTimestamp(act.timestamp)}
                        </div>
                    </div>
                </div>
            `;
        }).join('') : '<div class="empty-state"><p>No recent activity</p></div>';
        
        document.getElementById('recent-activity').innerHTML = activityHtml;
    }

    renderClasses() {
        const container = document.getElementById('classes-grid');
        
        if (this.data.classes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-school"></i>
                    <h3>No classes yet</h3>
                    <p>Create your first class to get started</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.data.classes.map(cls => {
            const studentCount = this.data.students.filter(s => s.classId === cls.id).length;
            const projectCount = this.data.projects.filter(p => p.classId === cls.id).length;
            const knowledgeCount = this.data.knowledge.filter(k => k.classId === cls.id).length;
            
            return `
                <div class="panel">
                    <div class="panel-content">
                        <div style="margin-bottom: 1rem;">
                            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--gray-900); margin-bottom: 0.25rem;">
                                ${cls.name}
                            </h3>
                            <p style="color: var(--gray-600); font-size: 0.875rem;">${cls.subject}</p>
                        </div>
                        
                        <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--gray-600); margin-bottom: 0.25rem;">CLASS CODE</div>
                            <div style="font-size: 1.75rem; font-weight: 700; font-family: monospace; letter-spacing: 0.1em; color: var(--primary-600);">
                                ${cls.code}
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                            <div style="text-align: center; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius-md);">
                                <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-600);">${studentCount}</div>
                                <div style="font-size: 0.75rem; color: var(--gray-600);">Students</div>
                            </div>
                            <div style="text-align: center; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius-md);">
                                <div style="font-size: 1.25rem; font-weight: 700; color: var(--secondary-600);">${projectCount}</div>
                                <div style="font-size: 0.75rem; color: var(--gray-600);">Projects</div>
                            </div>
                            <div style="text-align: center; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius-md);">
                                <div style="font-size: 1.25rem; font-weight: 700; color: var(--warning);">${knowledgeCount}</div>
                                <div style="font-size: 0.75rem; color: var(--gray-600);">Knowledge</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="secondary-button" style="flex: 1;" onclick="app.deleteClass('${cls.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderProjects() {
        const classFilter = document.getElementById('project-class-filter').value;
        let projects = this.data.projects;
        
        if (classFilter) {
            projects = projects.filter(p => p.classId === classFilter);
        }
        
        const container = document.getElementById('projects-grid');
        
        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No projects yet</h3>
                    <p>Create projects to organize knowledge</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = projects.map(proj => {
            const cls = this.data.classes.find(c => c.id === proj.classId);
            const knowledgeCount = this.data.knowledge.filter(k => k.projectId === proj.id).length;
            const dueDate = proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : 'No due date';
            
            return `
                <div class="panel">
                    <div class="panel-content">
                        <div style="margin-bottom: 1rem;">
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--gray-900); margin-bottom: 0.5rem;">
                                ${proj.name}
                            </h3>
                            <div class="tags">
                                <span class="tag">${cls ? cls.name : 'Unknown Class'}</span>
                            </div>
                        </div>
                        
                        ${proj.description ? `
                            <p style="color: var(--gray-600); font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.6;">
                                ${proj.description}
                            </p>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--gray-200);">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--gray-500);">Due Date</div>
                                <div style="font-size: 0.875rem; font-weight: 600; color: var(--gray-700);">${dueDate}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--gray-500);">Knowledge Items</div>
                                <div style="font-size: 0.875rem; font-weight: 600; color: var(--primary-600);">${knowledgeCount}</div>
                            </div>
                            <button class="action-btn delete" onclick="app.deleteProject('${proj.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderKnowledge() {
        const classFilter = document.getElementById('knowledge-class-filter').value;
        const projectFilter = document.getElementById('knowledge-project-filter').value;
        const searchTerm = document.getElementById('knowledge-search').value.toLowerCase();
        
        let knowledge = this.data.knowledge;
        
        if (classFilter) {
            knowledge = knowledge.filter(k => k.classId === classFilter);
        }
        if (projectFilter) {
            knowledge = knowledge.filter(k => k.projectId === projectFilter);
        }
        if (searchTerm) {
            knowledge = knowledge.filter(k => 
                k.question.toLowerCase().includes(searchTerm) ||
                k.answer.toLowerCase().includes(searchTerm) ||
                (k.tags && k.tags.some(t => t.toLowerCase().includes(searchTerm)))
            );
        }
        
        const container = document.getElementById('knowledge-list');
        
        if (knowledge.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-brain"></i>
                    <h3>No knowledge items found</h3>
                    <p>Add knowledge to help your AI assistant</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = knowledge.map(item => {
            const cls = this.data.classes.find(c => c.id === item.classId);
            const proj = item.projectId ? this.data.projects.find(p => p.id === item.projectId) : null;
            
            return `
                <div class="knowledge-item">
                    <div class="question">${item.question}</div>
                    <div class="answer">${item.answer}</div>
                    <div class="meta">
                        <div class="tags">
                            <span class="tag">${cls ? cls.name : 'Unknown'}</span>
                            ${proj ? `<span class="tag"><i class="fas fa-folder"></i> ${proj.name}</span>` : ''}
                            ${item.tags ? item.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                        </div>
                        <div class="actions">
                            <button class="action-btn" onclick="app.editKnowledge('${item.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-btn delete" onclick="app.deleteKnowledge('${item.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStudents() {
        const classFilter = document.getElementById('students-class-filter').value;
        let students = this.data.students;
        
        if (classFilter) {
            students = students.filter(s => s.classId === classFilter);
        }
        
        const container = document.getElementById('students-grid');
        
        if (students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No students yet</h3>
                    <p>Students will appear here when they join</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = students.map(student => {
            const initial = student.name.charAt(0).toUpperCase();
            const joinedDate = new Date(student.joinedAt).toLocaleDateString();
            
            return `
                <div class="panel">
                    <div class="panel-content" style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 60px; height: 60px; border-radius: var(--radius-full); background: var(--primary-100); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
                            ${initial}
                        </div>
                        <div style="flex: 1;">
                            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--gray-900); margin-bottom: 0.25rem;">
                                ${student.name}
                            </h4>
                            <p style="font-size: 0.875rem; color: var(--gray-600);">${student.className}</p>
                            <p style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">Joined ${joinedDate}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========================================
    // CLASS MANAGEMENT
    // ========================================
    
    createClass() {
        document.getElementById('modal-class-name').value = '';
        document.getElementById('modal-class-subject').value = '';
        document.getElementById('modal-class-grade').value = '';
        document.getElementById('modal-class-description').value = '';
        this.openModal('class-modal');
    }

    saveClass() {
        const name = document.getElementById('modal-class-name').value.trim();
        const subject = document.getElementById('modal-class-subject').value.trim();
        const grade = document.getElementById('modal-class-grade').value.trim();
        const description = document.getElementById('modal-class-description').value.trim();
        
        if (!name || !subject) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }
        
        const classData = {
            id: this.generateId(),
            name,
            subject,
            grade,
            description,
            code: this.generateClassCode(),
            createdAt: new Date().toISOString()
        };
        
        this.data.classes.push(classData);
        this.saveData();
        this.closeModal('class-modal');
        this.showToast('Class created successfully!', 'success');
        this.renderClasses();
        this.updateStats();
        this.populateDropdowns();
    }

    deleteClass(id) {
        if (!confirm('Delete this class? This will remove all associated projects, knowledge, and students.')) {
            return;
        }
        
        this.data.classes = this.data.classes.filter(c => c.id !== id);
        this.data.projects = this.data.projects.filter(p => p.classId !== id);
        this.data.knowledge = this.data.knowledge.filter(k => k.classId !== id);
        this.data.students = this.data.students.filter(s => s.classId !== id);
        
        this.saveData();
        this.showToast('Class deleted', 'success');
        this.renderClasses();
        this.updateStats();
    }

    // ========================================
    // PROJECT MANAGEMENT
    // ========================================
    
    createProject() {
        if (this.data.classes.length === 0) {
            this.showToast('Create a class first', 'warning');
            return;
        }
        
        document.getElementById('modal-project-name').value = '';
        document.getElementById('modal-project-due').value = '';
        document.getElementById('modal-project-description').value = '';
        this.openModal('project-modal');
    }

    saveProject() {
        const classId = document.getElementById('modal-project-class').value;
        const name = document.getElementById('modal-project-name').value.trim();
        const dueDate = document.getElementById('modal-project-due').value;
        const description = document.getElementById('modal-project-description').value.trim();
        
        if (!classId || !name) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }
        
        const project = {
            id: this.generateId(),
            classId,
            name,
            dueDate,
            description,
            createdAt: new Date().toISOString()
        };
        
        this.data.projects.push(project);
        this.saveData();
        this.closeModal('project-modal');
        this.showToast('Project created!', 'success');
        this.renderProjects();
        this.updateStats();
        this.populateDropdowns();
        
        this.logActivity({
            type: 'project_created',
            projectName: name,
            classId,
            timestamp: new Date().toISOString()
        });
    }

    deleteProject(id) {
        if (!confirm('Delete this project? Associated knowledge will remain but lose project association.')) {
            return;
        }
        
        // Remove project reference from knowledge
        this.data.knowledge.forEach(k => {
            if (k.projectId === id) {
                k.projectId = null;
            }
        });
        
        this.data.projects = this.data.projects.filter(p => p.id !== id);
        this.saveData();
        this.showToast('Project deleted', 'success');
        this.renderProjects();
        this.updateStats();
    }

    filterProjects() {
        this.renderProjects();
    }

    // ========================================
    // KNOWLEDGE MANAGEMENT
    // ========================================
    
    addKnowledge() {
        if (this.data.classes.length === 0) {
            this.showToast('Create a class first', 'warning');
            return;
        }
        
        document.getElementById('modal-knowledge-question').value = '';
        document.getElementById('modal-knowledge-answer').value = '';
        document.getElementById('modal-knowledge-tags').value = '';
        this.openModal('knowledge-modal');
    }

    saveKnowledge() {
        const classId = document.getElementById('modal-knowledge-class').value;
        const projectId = document.getElementById('modal-knowledge-project').value;
        const question = document.getElementById('modal-knowledge-question').value.trim();
        const answer = document.getElementById('modal-knowledge-answer').value.trim();
        const tags = document.getElementById('modal-knowledge-tags').value;
        
        if (!classId || !question || !answer) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }
        
        const knowledge = {
            id: this.generateId(),
            classId,
            projectId: projectId || null,
            question,
            answer,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
            createdAt: new Date().toISOString()
        };
        
        this.data.knowledge.push(knowledge);
        this.saveData();
        this.closeModal('knowledge-modal');
        this.showToast('Knowledge added!', 'success');
        this.renderKnowledge();
        this.updateStats();
        
        this.logActivity({
            type: 'knowledge_added',
            classId,
            timestamp: new Date().toISOString()
        });
    }

    editKnowledge(id) {
        const item = this.data.knowledge.find(k => k.id === id);
        if (!item) return;
        
        const newQuestion = prompt('Edit Question:', item.question);
        if (newQuestion === null) return;
        
        const newAnswer = prompt('Edit Answer:', item.answer);
        if (newAnswer === null) return;
        
        item.question = newQuestion.trim();
        item.answer = newAnswer.trim();
        
        this.saveData();
        this.showToast('Knowledge updated', 'success');
        this.renderKnowledge();
    }

    deleteKnowledge(id) {
        if (!confirm('Delete this knowledge item?')) return;
        
        this.data.knowledge = this.data.knowledge.filter(k => k.id !== id);
        this.saveData();
        this.showToast('Knowledge deleted', 'success');
        this.renderKnowledge();
        this.updateStats();
    }

    filterKnowledge() {
        this.renderKnowledge();
    }

    searchKnowledge() {
        this.renderKnowledge();
    }

    updateProjectDropdown() {
        const classId = document.getElementById('modal-knowledge-class').value;
        const projectSelect = document.getElementById('modal-knowledge-project');
        
        const projects = this.data.projects.filter(p => p.classId === classId);
        
        projectSelect.innerHTML = '<option value="">General (applies to whole class)</option>' +
            projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    // ========================================
    // AI CONFIGURATION
    // ========================================
    
    loadAIConfig() {
        document.getElementById('global-rules').value = this.data.rules.global || '';
        this.populateRulesDropdowns();
    }

    populateRulesDropdowns() {
        const classSelect = document.getElementById('rules-class-select');
        classSelect.innerHTML = '<option value="">Select a class</option>' +
            this.data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        const projectSelect = document.getElementById('rules-project-select');
        projectSelect.innerHTML = '<option value="">Select a project</option>' +
            this.data.projects.map(p => {
                const cls = this.data.classes.find(c => c.id === p.classId);
                return `<option value="${p.id}">${p.name} (${cls ? cls.name : 'Unknown'})</option>`;
            }).join('');
    }

    loadClassRules() {
        const classId = document.getElementById('rules-class-select').value;
        document.getElementById('class-rules').value = this.data.rules.classes[classId] || '';
    }

    loadProjectRules() {
        const projectId = document.getElementById('rules-project-select').value;
        document.getElementById('project-rules').value = this.data.rules.projects[projectId] || '';
    }

    saveRules(type) {
        if (type === 'global') {
            this.data.rules.global = document.getElementById('global-rules').value;
        } else if (type === 'class') {
            const classId = document.getElementById('rules-class-select').value;
            if (!classId) {
                this.showToast('Select a class first', 'warning');
                return;
            }
            this.data.rules.classes[classId] = document.getElementById('class-rules').value;
        } else if (type === 'project') {
            const projectId = document.getElementById('rules-project-select').value;
            if (!projectId) {
                this.showToast('Select a project first', 'warning');
                return;
            }
            this.data.rules.projects[projectId] = document.getElementById('project-rules').value;
        }
        
        this.saveData();
        this.showToast('Rules saved!', 'success');
    }

    filterStudents() {
        this.renderStudents();
    }

    // ========================================
    // STUDENT DASHBOARD
    // ========================================
    
    loadStudentDashboard() {
        document.getElementById('student-name-display').textContent = this.currentUser.name;
        document.getElementById('student-class-title').textContent = this.currentUser.className;
        
        this.showScreen('student-dashboard');
        this.loadStudentProjects();
        this.loadQuickInfo();
        this.loadConversation();
    }

    loadStudentProjects() {
        const projects = this.data.projects.filter(p => p.classId === this.currentUser.classId);
        const select = document.getElementById('student-project-select');
        
        select.innerHTML = '<option value="">General Questions</option>' +
            projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    switchStudentProject() {
        this.currentProject = document.getElementById('student-project-select').value;
        this.loadQuickInfo();
        this.loadConversation();
    }

    loadQuickInfo() {
        const container = document.getElementById('quick-info');
        let knowledge = this.data.knowledge.filter(k => k.classId === this.currentUser.classId);
        
        if (this.currentProject) {
            knowledge = knowledge.filter(k => k.projectId === this.currentProject);
        }
        
        // Show important info
        const important = knowledge.filter(k => {
            const q = k.question.toLowerCase();
            return q.includes('due') || q.includes('deadline') || q.includes('submit');
        }).slice(0, 5);
        
        if (important.length > 0) {
            container.innerHTML = important.map(item => `
                <div class="quick-info-item">
                    <div class="label">${item.question}</div>
                    <div class="value">${item.answer}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: var(--gray-500); font-size: 0.875rem;">No quick info available</p>';
        }
    }

    loadConversation() {
        const key = `${this.currentUser.classId}_${this.currentUser.id}_${this.currentProject || 'general'}`;
        const messages = this.data.conversations[key] || [];
        
        const container = document.getElementById('chat-messages');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="message system">
                    👋 Welcome to ${this.currentUser.className}! Ask me anything about the class or your assignments.
                </div>
            `;
        } else {
            container.innerHTML = messages.map(msg => `
                <div class="message ${msg.role}">
                    ${msg.content}
                </div>
            `).join('');
        }
        
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('student-input');
        const question = input.value.trim();
        
        if (!question) return;
        
        const sendBtn = document.getElementById('send-button');
        sendBtn.disabled = true;
        input.value = '';
        input.style.height = 'auto';
        
        // Add user message
        const key = `${this.currentUser.classId}_${this.currentUser.id}_${this.currentProject || 'general'}`;
        if (!this.data.conversations[key]) {
            this.data.conversations[key] = [];
        }
        
        this.data.conversations[key].push({
            role: 'user',
            content: question,
            timestamp: new Date().toISOString()
        });
        
        this.loadConversation();
        
        // Show typing indicator
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.classList.add('active');
        
        // Get AI response
        const response = await this.getAIResponse(question);
        
        typingIndicator.classList.remove('active');
        
        this.data.conversations[key].push({
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        this.saveData();
        this.loadConversation();
        sendBtn.disabled = false;
    }

    async getAIResponse(question) {
        // Build context
        let knowledge = this.data.knowledge.filter(k => k.classId === this.currentUser.classId);
        
        if (this.currentProject) {
            knowledge = knowledge.filter(k => k.projectId === this.currentProject || !k.projectId);
        }
        
        let context = `You are an AI teaching assistant for "${this.currentUser.className}".\n\n`;
        
        // Add rules in order of specificity
        if (this.data.rules.global) {
            context += `GLOBAL RULES:\n${this.data.rules.global}\n\n`;
        }
        
        if (this.data.rules.classes[this.currentUser.classId]) {
            context += `CLASS RULES:\n${this.data.rules.classes[this.currentUser.classId]}\n\n`;
        }
        
        if (this.currentProject && this.data.rules.projects[this.currentProject]) {
            context += `PROJECT RULES:\n${this.data.rules.projects[this.currentProject]}\n\n`;
        }
        
        // Add knowledge base
        if (knowledge.length > 0) {
            context += `KNOWLEDGE BASE:\n`;
            knowledge.forEach(k => {
                context += `Q: ${k.question}\nA: ${k.answer}\n\n`;
            });
        }
        
        context += `IMPORTANT: Base your answer primarily on the knowledge base above. If the information isn't available, politely tell the student to ask their teacher.\n\n`;
        context += `Student's Question: ${question}\n\nProvide a helpful, friendly response:`;
        
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [
                        { role: 'user', content: context }
                    ]
                })
            });
            
            const data = await response.json();
            
            if (data.content && data.content[0] && data.content[0].text) {
                return data.content[0].text;
            } else {
                return this.getFallbackResponse(question, knowledge);
            }
        } catch (error) {
            console.error('AI Error:', error);
            return this.getFallbackResponse(question, knowledge);
        }
    }

    getFallbackResponse(question, knowledge) {
        const questionLower = question.toLowerCase();
        
        // Smart keyword matching
        for (const item of knowledge) {
            const keywords = item.question.toLowerCase().split(/\s+/);
            const matchCount = keywords.filter(kw => questionLower.includes(kw)).length;
            
            if (matchCount >= 2 || questionLower.includes(item.question.toLowerCase())) {
                return `Based on what I know: ${item.answer}\n\nDoes this answer your question?`;
            }
        }
        
        // Check for common questions
        if (questionLower.includes('due') || questionLower.includes('deadline')) {
            return "I don't have specific information about due dates for this. Please check with your teacher or look for announcements in class materials.";
        }
        
        if (questionLower.includes('submit') || questionLower.includes('turn in')) {
            return "I don't have submission instructions in my knowledge base. Please ask your teacher for the specific submission process.";
        }
        
        return "I don't have information about that in my knowledge base. Please ask your teacher for help with this question!";
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
    populateDropdowns() {
        // Project class filter
        const projectClassFilter = document.getElementById('project-class-filter');
        if (projectClassFilter) {
            projectClassFilter.innerHTML = '<option value="">All Classes</option>' +
                this.data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        // Knowledge filters
        const knowledgeClassFilter = document.getElementById('knowledge-class-filter');
        if (knowledgeClassFilter) {
            knowledgeClassFilter.innerHTML = '<option value="">All Classes</option>' +
                this.data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        const knowledgeProjectFilter = document.getElementById('knowledge-project-filter');
        if (knowledgeProjectFilter) {
            knowledgeProjectFilter.innerHTML = '<option value="">All Projects</option>' +
                this.data.projects.map(p => {
                    const cls = this.data.classes.find(c => c.id === p.classId);
                    return `<option value="${p.id}">${p.name} (${cls ? cls.name : ''})</option>`;
                }).join('');
        }
        
        // Students filter
        const studentsFilter = document.getElementById('students-class-filter');
        if (studentsFilter) {
            studentsFilter.innerHTML = '<option value="">All Classes</option>' +
                this.data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        // Modal dropdowns
        const modalProjectClass = document.getElementById('modal-project-class');
        if (modalProjectClass) {
            modalProjectClass.innerHTML = '<option value="">Select a class</option>' +
                this.data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        const modalKnowledgeClass = document.getElementById('modal-knowledge-class');
        if (modalKnowledgeClass) {
            modalKnowledgeClass.innerHTML = '<option value="">Select a class</option>' +
                this.data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} active`;
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateClassCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Check if code exists
        if (this.data.classes.some(c => c.code === code)) {
            return this.generateClassCode();
        }
        return code;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    }

    logActivity(activity) {
        this.data.activity.push(activity);
        if (this.data.activity.length > 50) {
            this.data.activity = this.data.activity.slice(-50);
        }
        this.saveData();
    }

    createDemoData() {
        const demoClass = {
            id: this.generateId(),
            name: 'AP Biology',
            subject: 'Biology',
            grade: '11th Grade',
            description: 'Advanced Placement Biology course covering molecular biology, genetics, and ecology',
            code: 'DEMO42',
            createdAt: new Date().toISOString()
        };
        
        this.data.classes.push(demoClass);
        
        const demoProject = {
            id: this.generateId(),
            classId: demoClass.id,
            name: 'Cell Structure Research Paper',
            dueDate: '2026-03-15',
            description: 'Research paper on eukaryotic cell structures and organelle functions',
            createdAt: new Date().toISOString()
        };
        
        this.data.projects.push(demoProject);
        
        const demoKnowledge = [
            {
                id: this.generateId(),
                classId: demoClass.id,
                projectId: demoProject.id,
                question: 'When is the research paper due?',
                answer: 'The cell structure research paper is due on March 15, 2026 at 11:59 PM. Submit via Google Classroom.',
                tags: ['deadline', 'assignment'],
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                classId: demoClass.id,
                projectId: null,
                question: 'What are the office hours?',
                answer: 'Office hours are Monday and Wednesday 3:00-4:00 PM in Room 201. You can also schedule appointments via email.',
                tags: ['office hours', 'help'],
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                classId: demoClass.id,
                projectId: demoProject.id,
                question: 'How long should the research paper be?',
                answer: 'The research paper should be 5-7 pages, double-spaced, using APA format with at least 5 scholarly sources.',
                tags: ['requirements', 'assignment'],
                createdAt: new Date().toISOString()
            }
        ];
        
        this.data.knowledge.push(...demoKnowledge);
        
        this.data.rules.global = 'Always be encouraging and supportive. Guide students to think critically rather than giving direct answers. If a student seems frustrated, remind them help is available during office hours.';
        this.data.rules.classes[demoClass.id] = 'Focus on helping students understand biological concepts deeply. Encourage them to make connections between different topics. Reference the textbook chapters when appropriate.';
        this.data.rules.projects[demoProject.id] = 'For the research paper, guide students on research methodology and source evaluation. Don\'t write content for them, but help them organize their thoughts and understand the grading rubric.';
        
        this.saveData();
    }
}

// Initialize the application
const app = new EduAIPro();
