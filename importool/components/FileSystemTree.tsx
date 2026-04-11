import React, { useMemo, useState, useEffect } from 'react';
import { FileNode } from '../types';

interface FileSystemTreeProps {
  files: FileNode[];
  rootName: string;
}

interface TreeNode {
  name: string;
  path: string;
  children: Record<string, TreeNode>;
  files: FileNode[];
}

const FileSystemTree: React.FC<FileSystemTreeProps> = ({ files, rootName }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootName]));

  // Auto-expand tree when files change
  useEffect(() => {
    // Logic to handle auto-expansion if needed in the future
  }, [files, rootName]);

  const tree = useMemo(() => {
    const root: TreeNode = { name: rootName, path: rootName, children: {}, files: [] };
    const allPaths = new Set<string>();
    allPaths.add(rootName);

    files.forEach(file => {
      // Strip leading slashes and split
      const rawPath = file.displayPath || file.name;
      const parts = rawPath.split(/[\\/]/);
      
      let current = root;
      let currentPathAccumulator = rootName; // Start with root name

      // Navigate/Build tree
      parts.slice(0, -1).forEach((part) => {
        // Build a unique path key for the node
        currentPathAccumulator = `${currentPathAccumulator}/${part}`;
        
        if (!current.children[part]) {
          current.children[part] = { name: part, path: currentPathAccumulator, children: {}, files: [] };
        }
        
        allPaths.add(currentPathAccumulator);
        current = current.children[part];
      });
      
      current.files.push(file);
    });
    
    return { root, paths: allPaths };
  }, [files, rootName]);

  // Effect to apply auto-expansion
  useEffect(() => {
    if (tree.paths.size > 0) {
        setExpanded(tree.paths);
    }
  }, [tree]);

  const toggleExpand = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.path);
    const hasChildren = Object.keys(node.children).length > 0 || node.files.length > 0;
    const indent = depth * 12;

    return (
      <div key={node.path}>
        {/* Folder Row */}
        <div 
          className={`flex items-center py-1 hover:bg-gray-800 cursor-pointer text-sm select-none ${depth === 0 ? 'font-bold text-blue-400' : 'text-gray-300'}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => toggleExpand(node.path)}
        >
          <span className="mr-2 w-4 text-center text-gray-500">
             {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className="truncate">
            {depth === 0 ? rootName : node.name}
          </span>
        </div>

        {/* Children */}
        {isExpanded && (
          <div>
            {Object.values(node.children).sort((a,b) => a.name.localeCompare(b.name)).map(child => renderNode(child, depth + 1))}
            {node.files.map(file => (
              <div 
                key={file.id} 
                className="flex items-center py-0.5 hover:bg-gray-800 text-xs text-gray-400 font-mono"
                style={{ paddingLeft: `${indent + 24}px` }}
              >
                 <span className={`w-2 h-2 rounded-full mr-2 ${file.extension === 'ARW' ? 'bg-orange-500' : file.extension === 'MP4' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                 {file.name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-auto h-full">
      {renderNode(tree.root, 0)}
    </div>
  );
};

export default FileSystemTree;