import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Project {
  id?: number;
  name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  tech_stack: string[];
  description: string;
  link: string | null;
}

interface ProjectFormModalProps {
  project: Project | null;
  onSave: (data: Omit<Project, 'id'>) => void;
  onClose: () => void;
}

export function ProjectFormModal({ project, onSave, onClose }: ProjectFormModalProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    role: project?.role || '',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    tech_stack: project?.tech_stack.join(', ') || '',
    description: project?.description || '',
    link: project?.link || '',
  });
  const [newTech, setNewTech] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        role: project.role || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        tech_stack: project.tech_stack.join(', ') || '',
        description: project.description || '',
        link: project.link || '',
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      role: formData.role,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      tech_stack: formData.tech_stack.split(',').map(t => t.trim()).filter(Boolean),
      description: formData.description,
      link: formData.link || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-800">
            {project ? '编辑项目' : '添加项目'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">项目名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">你的角色</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              placeholder="如：前端负责人"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">开始时间</label>
              <input
                type="month"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">结束时间</label>
              <input
                type="month"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                placeholder="留空表示至今"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">技术栈</label>
            <input
              type="text"
              value={formData.tech_stack}
              onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
              placeholder="用逗号分隔，如：React, TypeScript, Node.js"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">项目描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="描述你的主要工作和成果..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">项目链接（可选）</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
