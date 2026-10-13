'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Mail, Phone, MapPin, Calendar, UserPlus } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useLocale } from '../../lib/locale'

export default function ProjectsTeamPage() {
  const { t } = useLocale()
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  // Mock data - in a real app, this would come from your API/database
  const teamMembers = [
    {
      id: '1',
      name: 'John Doe',
      role: 'Senior Developer',
      email: 'john.doe@worksuite.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      joinDate: '2023-01-15',
      avatar: null,
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      currentProjects: ['Website Redesign', 'Mobile App Development'],
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      role: 'UI/UX Designer',
      email: 'sarah.johnson@worksuite.com',
      phone: '+1 (555) 234-5678',
      location: 'New York, NY',
      joinDate: '2023-02-20',
      avatar: null,
      skills: ['Figma', 'Adobe Creative Suite', 'User Research', 'Prototyping'],
      currentProjects: ['Website Redesign', 'Brand Identity'],
      status: 'active'
    },
    {
      id: '3',
      name: 'Mike Chen',
      role: 'Project Manager',
      email: 'mike.chen@worksuite.com',
      phone: '+1 (555) 345-6789',
      location: 'Austin, TX',
      joinDate: '2022-11-10',
      avatar: null,
      skills: ['Agile', 'Scrum', 'Risk Management', 'Team Leadership'],
      currentProjects: ['System Integration', 'Website Redesign'],
      status: 'active'
    },
    {
      id: '4',
      name: 'Emily Davis',
      role: 'QA Engineer',
      email: 'emily.davis@worksuite.com',
      phone: '+1 (555) 456-7890',
      location: 'Seattle, WA',
      joinDate: '2023-03-05',
      avatar: null,
      skills: ['Testing', 'Automation', 'Bug Tracking', 'Quality Assurance'],
      currentProjects: ['Mobile App Development', 'System Integration'],
      status: 'active'
    },
    {
      id: '5',
      name: 'Alex Rodriguez',
      role: 'DevOps Engineer',
      email: 'alex.rodriguez@worksuite.com',
      phone: '+1 (555) 567-8901',
      location: 'Denver, CO',
      joinDate: '2023-04-12',
      avatar: null,
      skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
      currentProjects: ['System Integration'],
      status: 'active'
    }
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('projects.teamPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('projects.teamPage.subtitle')}
            </p>
          </div>
          <button className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white shape-sm transition-colors">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {teamMembers.length}
                </p>
              </div>
              <div className="p-3 shape-sm bg-violet-200 dark:bg-violet-900">
                <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {teamMembers.filter(member => member.status === 'active').length}
                </p>
              </div>
              <div className="p-3 shape-sm bg-green-200 dark:bg-green-900">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Roles</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {new Set(teamMembers.map(member => member.role)).size}
                </p>
              </div>
              <div className="p-3 shape-sm bg-blue-200 dark:bg-blue-900">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-violet-200 dark:bg-violet-900 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                    {getInitials(member.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {member.role}
                  </p>
                  <div className="flex items-center space-x-1 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedMember === member.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{member.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatDate(member.joinDate)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map(skill => (
                        <span
                          key={skill}
                          className="px-2 py-1 text-xs bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">Current Projects</h4>
                    <div className="space-y-1">
                      {member.currentProjects.map(project => (
                        <div
                          key={project}
                          className="text-sm text-gray-600 dark:text-gray-400"
                        >
                          • {project}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Add Member CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center"
        >
          <div className="w-16 h-16 bg-violet-200 dark:bg-violet-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            Need more team members?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add new team members to collaborate on your projects
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white shape-sm transition-colors">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Team Member
          </button>
        </motion.div>
      </div>
    </RoleGuard>
  )
}
