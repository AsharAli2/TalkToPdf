
'use client'
import { useUser } from '@clerk/nextjs'
import { FileText, Upload, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface FileUploadComponentProps {
  setcollectionName: React.Dispatch<React.SetStateAction<string>>;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ setcollectionName,setMessages }) => {
  const { user } = useUser()
  const [file, setfile] = useState<string | null>(null)
  const [userName, setuserName] = useState<string | null>(null)
  const [loading, setloading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setuserName(user.fullName)
      const getcollection = async () => {
        const response = await fetch(`http://localhost:8000/check-collection?name=${user.fullName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (data.exists) {
          setfile(data.sources)
          setcollectionName(data.collection)
          setloading(false)
        } else {
          setcollectionName(user.fullName ?? '')
          setloading(false)
        }
      }
      getcollection()
    }
  }, [user])

  const HandleFileUpload = () => {
    if (file) return
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'application/pdf');  // fix typo here
    fileInput.addEventListener('change', (event) => {
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files.item(0);
        if (file) {
          setfile(file.name)
          const formdata = new FormData();
          formdata.append('pdf', file)
          fetch(`http://localhost:8000/upload/pdf?username=${userName}`, {
            method: 'POST',
            body: formdata,
          })
        }
      }
    })
    fileInput.click();
  }

  const handleDeleteCollection = async () => {
    if (!userName) return
    setDeleting(true)
    try {
      const response = await fetch('http://localhost:8000/delete-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionName: userName }),
      })
      const data = await response.json()
      if (response.ok) {
        setfile(null)
        setcollectionName('')
        setMessages([])
      } else {
        alert(data.error || 'Failed to delete collection')
      }
    } catch (error) {
      alert('Error deleting collection')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full hover:cursor-pointer">
        <h3 className='text-white'>Loading...</h3>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center space-x-4 hover:cursor-pointer" onClick={HandleFileUpload}>
        {
          file ?
            <>
              <FileText />
              <h4 className='text-white'>{file}</h4>
            </>
            :
            <>
              <h3>File upload</h3>
              <Upload />
            </>
        }
      </div>
      {file && (
  <p className="text-red-500 mt-2 text-center max-w-xs">
    You can upload only one PDF at a time. To upload a new PDF, please delete the previous one first.
  </p>
)}

      {
        file &&
        <button
          onClick={handleDeleteCollection}
          disabled={deleting}
          className="mt-3 flex items-center space-x-2 text-red-500 hover:text-red-700 rounded-full border-2 p-2"
        >
          {/* <Trash2 /> */}
          <span>{deleting ? 'Deleting...' : 'Delete Collection'}</span>
        </button>
      }
    </div>
  )
}

export default FileUploadComponent
