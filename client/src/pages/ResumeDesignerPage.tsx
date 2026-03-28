import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, X, Copy, Download, FileText, Sparkles, Loader2, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resumeApi } from '../lib/api';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFormModal } from '../components/ProjectFormModal';

interface Project {
  id: number;
  name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  tech_stack: string[];
  description: string;
  link: string | null;
}

interface Skill {
  id: number;
  name: string;
  category: string;
}

type TabType = 'projects' | 'skills' | 'generate';

const styleOptions = [
  { value: 'professional', label: '专业简洁' },
  { value: 'creative', label: '创意活泼' },
  { value: 'technical', label: '技术导向' },
];

export function ResumeDesignerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('professional');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsData, skillsData] = await Promise.all([
        resumeApi.getProjects().catch(() => ({ projects: [] })),
        resumeApi.getSkills().catch(() => ({ skills: [] })),
      ]);
      setProjects(projectsData.projects || []);
      setSkills(skillsData.skills || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (data: Omit<Project, 'id'>) => {
    try {
      await resumeApi.createProject(data);
      fetchData();
      setShowProjectModal(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleUpdateProject = async (id: number, data: Omit<Project, 'id'>) => {
    try {
      await resumeApi.updateProject(id, data);
      fetchData();
      setEditingProject(null);
      setShowProjectModal(false);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('确定删除此项目？')) return;
    try {
      await resumeApi.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      await resumeApi.createSkill({ name: newSkill.trim(), category: 'general' });
      fetchData();
      setNewSkill('');
    } catch (err) {
      console.error('Failed to add skill:', err);
    }
  };

  const handleDeleteSkill = async (id: number) => {
    try {
      await resumeApi.deleteSkill(id);
      setSkills(skills.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleGenerate = async () => {
    if (!targetPosition.trim()) {
      alert('请输入目标职位');
      return;
    }
    setGenerating(true);
    try {
      const result = await resumeApi.generate({
        target_position: targetPosition,
        target_company: targetCompany || undefined,
        style: selectedStyle,
      });
      setGeneratedResume(result.resume || result.content || '');
    } catch (err) {
      console.error('Failed to generate resume:', err);
      alert('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResume);
    alert('已复制到剪贴板');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedResume], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#e8f4fc] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
          </Link>
          <h1 className="font-pixel text-xl text-gray-800">简历设计</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['projects', 'skills', 'generate'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'projects' && '项目经历'}
                {tab === 'skills' && '技能'}
                {tab === 'generate' && '生成简历'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : activeTab === 'projects' ? (
              <div className="space-y-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => {
                      setEditingProject(project);
                      setShowProjectModal(true);
                    }}
                    onDelete={() => handleDeleteProject(project.id)}
                  />
                ))}
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setShowProjectModal(true);
                  }}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  添加项目
                </button>
              </div>
            ) : activeTab === 'skills' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm"
                    >
                      {skill.name}
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="输入技能名称"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
                  />
                  <button
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    添加
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">目标职位</label>
                    <input
                      type="text"
                      value={targetPosition}
                      onChange={(e) => setTargetPosition(e.target.value)}
                      placeholder="如：前端工程师"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">目标公司（可选）</label>
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="如：字节跳动"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">简历风格</label>
                    <div className="flex gap-2">
                      {styleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedStyle(opt.value)}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            selectedStyle === opt.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      生成简历
                    </>
                  )}
                </button>

                {generatedResume && (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        复制
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        下载
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {generatedResume}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showProjectModal && (
        <ProjectFormModal
          project={editingProject}
          onSave={editingProject ? (data) => handleUpdateProject(editingProject.id, data) : handleAddProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
