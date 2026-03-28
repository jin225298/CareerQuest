import { motion } from 'framer-motion';
import { Edit2, Trash2, ExternalLink } from 'lucide-react';

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

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-xl p-4 border border-gray-100"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-gray-800">{project.name}</h3>
          <p className="text-sm text-gray-500">{project.role}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span>{formatDate(project.start_date)}</span>
        <span>-</span>
        <span>{project.end_date ? formatDate(project.end_date) : '至今'}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {project.tech_stack.map((tech, index) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs"
          >
            {tech}
          </span>
        ))}
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>

      {project.link && (
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-blue-500 hover:text-blue-600 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          查看链接
        </a>
      )}
    </motion.div>
  );
}
