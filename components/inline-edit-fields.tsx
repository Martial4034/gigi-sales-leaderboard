"use client";

import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InlineSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  isEditing: boolean;
  onEdit: () => void;
  className?: string;
}

export function InlineSelect({ value, onValueChange, options, isEditing, onEdit, className = "" }: InlineSelectProps) {
  if (isEditing) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`h-8 text-sm ${className}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const option = options.find(opt => opt.value === value);
  return (
    <span 
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors ${className}`}
      onClick={onEdit}
    >
      {option?.label || value}
    </span>
  );
}

interface InlineCashInputProps {
  value: number;
  onValueChange: (value: number) => void;
  isEditing: boolean;
  onEdit: () => void;
  className?: string;
}

export function InlineCashInput({ value, onValueChange, isEditing, onEdit, className = "" }: InlineCashInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isCustom, setIsCustom] = useState(![1000, 2000].includes(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && isCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, isCustom]);

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'custom') {
      setIsCustom(true);
      setInputValue(value.toString());
    } else {
      setIsCustom(false);
      const numValue = parseInt(selectedValue);
      onValueChange(numValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const numValue = parseInt(newValue) || 0;
    onValueChange(numValue);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Select value={isCustom ? 'custom' : value.toString()} onValueChange={handleSelectChange}>
          <SelectTrigger className="h-8 w-20 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1500">1500</SelectItem>
            <SelectItem value="2000">2000</SelectItem>
            <SelectItem value="3000">3000</SelectItem>
            <SelectItem value="4000">4000</SelectItem>
            <SelectItem value="4500">4500</SelectItem>
            <SelectItem value="5800">5800</SelectItem>
            <SelectItem value="custom">Autre</SelectItem>
          </SelectContent>
        </Select>
        {isCustom && (
          <input
            ref={inputRef}
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            className="h-8 w-20 px-2 text-sm border rounded"
            min="0"
            max="10000"
            placeholder="Montant"
          />
        )}
      </div>
    );
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors ${className}`}
      onClick={onEdit}
    >
      {value.toLocaleString()} €
    </span>
  );
}

interface InlineRevenueInputProps {
  value: number;
  onValueChange: (value: number) => void;
  isEditing: boolean;
  onEdit: () => void;
  className?: string;
}

export function InlineRevenueInput({ value, onValueChange, isEditing, onEdit, className = "" }: InlineRevenueInputProps) {
  if (isEditing) {
    return (
      <Select value={value.toString()} onValueChange={(val) => onValueChange(parseInt(val))}>
        <SelectTrigger className="h-8 w-24 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="5800">5800€</SelectItem>
          <SelectItem value="6000">6000€</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors ${className}`}
      onClick={onEdit}
    >
      {value.toLocaleString()} €
    </span>
  );
}

interface InlineTextInputProps {
  value: string;
  onValueChange: (value: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  placeholder?: string;
  className?: string;
}

export function InlineTextInput({ value, onValueChange, isEditing, onEdit, placeholder = "", className = "" }: InlineTextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`h-8 px-2 text-sm border rounded w-full ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span 
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors ${className}`}
      onClick={onEdit}
    >
      {value || placeholder}
    </span>
  );
}

interface InlineClientInputProps {
  firstName: string;
  lastName: string;
  onValueChange: (firstName: string, lastName: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  className?: string;
}

export function InlineClientInput({ firstName, lastName, onValueChange, isEditing, onEdit, className = "" }: InlineClientInputProps) {
  const [inputValue, setInputValue] = useState(`${firstName} ${lastName}`.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleBlur = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      // Séparer le nom en prénom et nom de famille
      const words = trimmedValue.split(' ');
      const newFirstName = words[0] || '';
      const newLastName = words.slice(1).join(' ') || '';
      onValueChange(newFirstName, newLastName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`h-8 px-2 text-sm border rounded w-full ${className}`}
        placeholder="Nom du client"
      />
    );
  }

  const displayName = `${firstName} ${lastName}`.trim();
  return (
    <span 
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors ${className}`}
      onClick={onEdit}
    >
      {displayName || '-'}
    </span>
  );
} 