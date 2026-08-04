import React from 'react'

export default async function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Project Team Management</h3>
        <p className="text-gray-600">
          This page will manage team assignments and roles for project ID: {id}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>• Add/remove team members from the project</li>
          <li>• Assign specific roles (manager, worker, observer)</li>
          <li>• Set project-specific hourly rates for team members</li>
          <li>• View team member workload and availability</li>
          <li>• Manage team permissions and access levels</li>
          <li>• Track team member time allocation and productivity</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded shadow">
          <h4 className="font-semibold mb-2">Current Team</h4>
          <p className="text-gray-600 text-sm">
            List of assigned team members with their roles and project-specific rates.
          </p>
        </div>
        
        <div className="p-6 bg-white rounded shadow">
          <h4 className="font-semibold mb-2">Available Members</h4>
          <p className="text-gray-600 text-sm">
            Organization members available to be added to the project team.
          </p>
        </div>
      </div>
    </div>
  )
}
