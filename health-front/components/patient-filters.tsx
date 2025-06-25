"use client"
import { useState } from "react"
import type { PatientFilters } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"

interface PatientFiltersProps {
  onFiltersChange: (filters: PatientFilters) => void
  isLoading?: boolean
}

export function PatientFiltersComponent({ onFiltersChange, isLoading }: PatientFiltersProps) {
  const [filters, setFilters] = useState<PatientFilters>({ gender: "all" })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFilterChange = (key: keyof PatientFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
  }

  const handleSearch = () => {
    onFiltersChange(filters)
  }

  const handleClear = () => {
    const clearedFilters = { gender: "all" }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const hasActiveFilters = Object.values(filters).some((value) => value && value.length > 0)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search & Filter Patients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="text-sm font-medium text-slate-700">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search by name, patient ID..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="border-slate-300">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClear} className="border-slate-300">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            <div>
              <Label htmlFor="gender" className="text-sm font-medium text-slate-700">
                Gender
              </Label>
              <Select value={filters.gender || "all"} onValueChange={(value) => handleFilterChange("gender", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date_from" className="text-sm font-medium text-slate-700">
                Date From
              </Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from || ""}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="date_to" className="text-sm font-medium text-slate-700">
                Date To
              </Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to || ""}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
