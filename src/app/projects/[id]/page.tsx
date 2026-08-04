import React from 'react'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <p className="text-gray-600">
          This page will display comprehensive project information for project ID: {id}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>• Project overview with description, timeline, and budget</li>
          <li>• Team member assignments and roles</li>
          <li>• Client associations and contact information</li>
          <li>• Time tracking entries and billable hours</li>
          <li>• Project milestones and progress tracking</li>
          <li>• File attachments and documentation</li>
          <li>• Project communication and updates</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded shadow">
          <h4 className="font-semibold mb-2">Project Timeline</h4>
          <p className="text-gray-600 text-sm">
            Visual timeline showing project phases, milestones, and deadlines.
          </p>
        </div>
        
        <div className="p-6 bg-white rounded shadow">
          <h4 className="font-semibold mb-2">Team & Resources</h4>
          <p className="text-gray-600 text-sm">
            Team member list with roles, hourly rates, and time allocation.
          </p>
        </div>
        
        <div className="p-6 bg-white rounded shadow">
          <h4 className="font-semibold mb-2">Financial Overview</h4>
          <p className="text-gray-600 text-sm">
            Budget tracking, actual costs, and revenue projections.
          </p>
        </div>
        
        <div className="p-6 bg-white rounded shadow">
          <h4 className="font-semibold mb-2">Recent Activity</h4>
          <p className="text-gray-600 text-sm">
            Latest time entries, updates, and project communications.
          </p>
        </div>
      </div>
    </div>
  )
}
