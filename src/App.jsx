import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as XLSX from 'xlsx'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

const App = () => {
  const [image, setImage] = useState(null)
  const [centers, setCenters] = useState([])
  const [selectedCenter, setSelectedCenter] = useState('')
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewCenterForm, setShowNewCenterForm] = useState(false)
  const [newCenterName, setNewCenterName] = useState('')
  const [editingExpense, setEditingExpense] = useState(null)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    fetchCenters()
  }, [])


  const fetchCenters = async () => {
    const { data, error } = await supabase.from('centri_spesa').select('*')
    if (error) {
      setError('Errore nel caricamento dei centri di spesa.')
    } else {
      setCenters(data)
    }
  }

  const fetchExpenses = async (centerId) => {
    try {
      const { data, error } = await supabase
        .from('spese')
        .select('*')
        .eq('center_id', centerId)
        .order('data_spesa', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      setError('Errore nel caricamento delle spese: ' + error.message)
    }
  }

  const handleCenterChange = (e) => {
    const centerId = e.target.value
    setSelectedCenter(centerId)
    if (centerId) {
      fetchExpenses(centerId)
    } else {
      setExpenses([])
    }
  }

  const handleCreateCenter = async (e) => {
    e.preventDefault()
    if (!newCenterName.trim()) {
      setError('Inserisci un nome per il centro di spesa.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('centri_spesa')
        .insert([{ nome: newCenterName.trim() }])
        .select()

      if (error) throw error

      setNewCenterName('')
      setShowNewCenterForm(false)
      await fetchCenters()
      
      if (data && data[0]) {
        setSelectedCenter(data[0].id)
        fetchExpenses(data[0].id)
      }
    } catch (error) {
      setError('Errore nella creazione del centro di spesa: ' + error.message)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    handleImage(file);
  };

  const handleTakePhoto = () => {
     const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setImage(imageDataUrl);
      analyzeImage(imageDataUrl);
      stopCamera();
    } else {
      setError('Impossibile scattare la foto. Riprova.');
    }
  };

  useEffect(() => {
    if (isCameraActive) {
      console.log("useEffect: isCameraActive is true, calling startCamera");
      startCamera();
    } else {
      console.log("useEffect: isCameraActive is false, calling stopCamera");
      stopCamera();
    }
  }, [isCameraActive]); // This effect runs whenever isCameraActive changes



  const startCamera = async () => {
    console.log("startCamera: videoRef.current valore all'inizio:", videoRef.current); // Aggiunto log
    setError('');
    setLoading(true); // Mostra "Inizializzando la fotocamera..."
    console.log("startCamera: Inizio inizializzazione fotocamera");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("startCamera: getUserMedia non supportato");
        setError('getUserMedia non è supportato in questo browser.');
        return; // Exit early
      }
      console.log("startCamera: getUserMedia supportato");

      // 1. Try with specific facingMode (environment)
      let streamConstraints = { video: { facingMode: 'environment' } };
      console.log("startCamera: Richiesta stream fotocamera");
      let stream;

      try {
          stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
      } catch (error) {
          console.warn("Failed to get environment camera, trying user-facing camera", error);
          // 2. Fallback to user-facing camera
          streamConstraints = { video: { facingMode: 'user' } };
          try {
              stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
          } catch (userError) {
              console.warn("Failed to get user-facing camera, trying any camera", userError);
              // 3. Try without any facingMode constraint
              streamConstraints = { video: true };
              try {
                  stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
              } catch (anyError) {
                  console.error("Failed to get any camera", anyError);
                  setError('Errore nell\'accesso alla fotocamera: ' + anyError.message);
                  setIsCameraActive(false);
                  setLoading(false);
                  return; // Exit, no camera available
              }
          }
      }

      console.log("startCamera: Stream fotocamera ottenuto", stream);

     if (!videoRef.current) {
        console.error("startCamera: Elemento video non trovato");
        console.log("startCamera: videoRef.current è:", videoRef.current);
        throw new Error('Elemento video non trovato.');
     } else {
       console.log("startCamera: Elemento video trovato", videoRef.current);
       videoRef.current.srcObject = stream;
       videoRef.current.onloadedmetadata = () => {
         console.log("startCamera: Metadati video caricati");
         videoRef.current.play().catch(err => {
           console.error("Error playing video:", err);
           setError("Errore durante la riproduzione del video: " + err.message);
           stopCamera();
         });
       };
       console.log("startCamera: Fotocamera attiva");
       setIsCameraActive(true);
      }
    } finally {
      setLoading(false); // Nascondi "Inizializzando la fotocamera..." indipendentemente dal risultato
    }
  };


  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const handleImage = (file) => {
    if (!selectedCenter) {
      setError('Seleziona o crea un centro di spesa prima di caricare uno scontrino.')
      return
    }

    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const imgData = reader.result;
        setImage(imgData);
        analyzeImage(imgData);
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async (imageData) => {
    setLoading(true)
    setError('')
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Replaced with gpt-4o.  Change this if needed!
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analizza questo scontrino e fornisci i seguenti dati in formato JSON: tipo di spesa, importo totale, descrizione dei prodotti/servizi, nome dell'azienda e data dello scontrino. Rispondi SOLO con un oggetto JSON valido con questa struttura precisa: {\"tipoSpesa\": string, \"importo\": number, \"descrizione\": string[], \"azienda\": string, \"dataSpesa\": string}. La data deve essere in formato ISO (YYYY-MM-DD). Se la data non è visibile nell'immagine, ometti il campo dataSpesa. Non aggiungere altro testo oltre al JSON." 
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ],
          },
        ],
        max_tokens: 300,
      })

      const analysisText = response.choices[0].message.content
      console.log('Raw API response:', analysisText)
      
      const parsedData = parseAnalysis(analysisText)
      console.log('Data to be saved:', parsedData)
      
      if (!parsedData.tipoSpesa || !parsedData.importo || !parsedData.azienda) {
        throw new Error('Dati incompleti o non validi')
      }

      await saveExpense(
        parsedData.tipoSpesa,
        parsedData.importo,
        parsedData.descrizione,
        parsedData.azienda,
        parsedData.dataSpesa,
        imageData
      )
    } catch (error) {
      console.error('Error:', error)
      setError(`Errore nell'analisi dell'immagine: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const parseAnalysis = (analysis) => {
    try {
      let jsonStr = analysis.replace(/```json\s*|\s*```/g, '')
      jsonStr = jsonStr.replace(/\\/g, '')
      const parsedData = JSON.parse(jsonStr)
      
      const result = {
        tipoSpesa: parsedData.tipoSpesa || 'Generico',
        importo: typeof parsedData.importo === 'number' ? parsedData.importo : 0,
        descrizione: Array.isArray(parsedData.descrizione) 
          ? parsedData.descrizione.join(', ') 
          : parsedData.descrizione || 'Descrizione non disponibile',
        azienda: parsedData.azienda || 'Azienda non disponibile',
        dataSpesa: parsedData.dataSpesa || null
      }

      console.log('Parsed data:', result)
      return result
    } catch (error) {
      console.error('Error parsing analysis:', error)
      console.log('Raw analysis:', analysis)
      return {
        tipoSpesa: 'Generico',
        importo: 0,
        descrizione: 'Errore nel parsing dei dati',
        azienda: 'Azienda non disponibile',
        dataSpesa: null
      }
    }
  }

  const saveExpense = async (tipoSpesa, importo, descrizione, azienda, dataSpesa, imageData) => {
    if (!selectedCenter) {
      setError('Seleziona un centro di spesa prima di salvare.')
      return
    }

    try {
      const expenseData = {
        center_id: selectedCenter,
        tipo_spesa: tipoSpesa,
        importo: parseFloat(importo),
        descrizione: descrizione,
        azienda: azienda,
        immagine_scontrino: imageData
      }

      if (dataSpesa) {
        expenseData.data_spesa = dataSpesa
      }

      const { error: supabaseError } = await supabase
        .from('spese')
        .insert([expenseData])

      if (supabaseError) throw supabaseError
      await fetchExpenses(selectedCenter)
    } catch (error) {
      console.error('Error saving expense:', error)
      setError('Errore nel salvataggio della spesa: ' + error.message)
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
  }

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa spesa?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('spese')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
      await fetchExpenses(selectedCenter)
    } catch (error) {
      setError('Errore nella cancellazione della spesa: ' + error.message)
    }
  }

  const handleUpdateExpense = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('spese')
        .update({
          azienda: editingExpense.azienda,
          tipo_spesa: editingExpense.tipo_spesa,
          importo: parseFloat(editingExpense.importo),
          descrizione: editingExpense.descrizione,
          data_spesa: editingExpense.data_spesa
        })
        .eq('id', editingExpense.id)

      if (error) throw error
      setEditingExpense(null)
      await fetchExpenses(selectedCenter)
    } catch (error) {
      setError('Errore nell\'aggiornamento della spesa: ' + error.message)
    }
  }

  const exportToExcel = () => {
    if (!expenses || expenses.length === 0) {
      setError('Nessuna spesa da esportare.')
      return
    }

    try {
      const wsData = expenses.map(expense => ({
        Data: expense.data_spesa ? new Date(expense.data_spesa).toLocaleDateString('it-IT') : '-',
        Azienda: expense.azienda,
        'Tipo Spesa': expense.tipo_spesa,
        'Importo (€)': expense.importo.toFixed(2),
        Descrizione: expense.descrizione
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, 'Spese')

      const centerName = centers.find(c => c.id === selectedCenter)?.nome || 'centro'
      XLSX.writeFile(wb, `spese_${centerName}.xlsx`)
    } catch (error) {
      setError('Errore durante l\'esportazione: ' + error.message)
    }
  }

  const viewReceipt = (imageData) => {
    if (!imageData) {
      setError('Nessuna immagine disponibile per questo scontrino.')
      return
    }
    
    const img = document.createElement('img');
    img.src = imageData;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '80vh';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.height = '100%';
    container.appendChild(img);

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.body.style.margin = '0';
      newWindow.document.body.style.backgroundColor = '#f8fafc';
      newWindow.document.body.appendChild(container);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Gestione Spese</h1>
      </div>

      <div className="form-section">
        <h2>Gestione Centro di Spesa</h2>
        <div className="center-management">
          <select
            onChange={handleCenterChange}
            value={selectedCenter}
            className="center-select"
          >
            <option value="">Seleziona un centro di spesa</option>
            {centers.map(center => (
              <option key={center.id} value={center.id}>
                {center.nome}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewCenterForm(!showNewCenterForm)}
            className="new-center-button"
          >
            {showNewCenterForm ? 'Annulla' : 'Nuovo Centro'}
          </button>
        </div>

        {showNewCenterForm && (
          <form onSubmit={handleCreateCenter} className="new-center-form">
            <input
              type="text"
              value={newCenterName}
              onChange={(e) => setNewCenterName(e.target.value)}
              placeholder="Nome del nuovo centro di spesa"
              className="new-center-input"
            />
            <button type="submit" className="create-center-button">
              Crea Centro
            </button>
          </form>
        )}

        <h2>Carica Scontrino</h2>
        {!isCameraActive ? (
          <>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
              disabled={!selectedCenter}
             />
              <button
                onClick={() => setIsCameraActive(true)}
                className="new-center-button"
                disabled={!selectedCenter}
              >
                Scatta Foto
                 {console.log("Button Scatta Foto clicked, videoRef.current is:", videoRef.current)} {/* Log before startCamera call */}

              </button>
           </>
         ) : (
           <>
             <video ref={videoRef} autoPlay playsInline className="video-preview"></video>
             <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
             {console.log("Video block rendered, videoRef.current inside block is:", videoRef.current)} {/* Log inside video block */}
             <div className="camera-buttons">
               <button onClick={handleTakePhoto} className="create-center-button">
                 Scatta
               </button>
               <button onClick={stopCamera} className="cancel-button">
                 Annulla

                </button>
              </div>
            </>

          )}
          
        {!selectedCenter && !isCameraActive && !loading && !(error) && ( //condizione per mostrare il warning corretta
          <p className="warning">
            Seleziona o crea un centro di spesa prima di caricare uno scontrino
          </p>
        )}

        {loading && <p className="loading">Analisi in corso...</p>}
        {error && <div className="error">{error}</div>}
       </div>

       <div className="table-section">
         <h2>Riepilogo Spese</h2>
         {expenses.length > 0 ? (
           <>
             <div className="table-actions">
               <button 
                 onClick={exportToExcel} 
                 className="export-button"
                 title="Esporta in Excel"
               >
                 Esporta in Excel
               </button>
             </div>
             <div className="table-container">
               <table>
                 <thead>
                   <tr>
                     <th>Data</th>
                     <th>Azienda</th>
                     <th>Tipo Spesa</th>
                     <th>Importo (€)</th>
                     <th>Descrizione</th>
                     <th>Scontrino</th>
                     <th>Azioni</th>
                   </tr>
                 </thead>
                 <tbody>
                   {expenses.map(expense => (
                     <tr key={expense.id}>
                       {editingExpense?.id === expense.id ? (
                         <>
                           <td>
                             <input
                               type="date"
                               value={editingExpense.data_spesa ? editingExpense.data_spesa.split('T')[0] : ''}
                               onChange={(e) => setEditingExpense({
                                 ...editingExpense,
                                 data_spesa: e.target.value
                               })}
                               className="edit-input"
                             />
                           </td>
                           <td>
                             <input
                               type="text"
                               value={editingExpense.azienda}
                               onChange={(e) => setEditingExpense({
                                 ...editingExpense,
                                 azienda: e.target.value
                               })}
                               className="edit-input"
                             />
                           </td>
                           <td>
                             <input
                               type="text"
                               value={editingExpense.tipo_spesa}
                               onChange={(e) => setEditingExpense({
                                 ...editingExpense,
                                 tipo_spesa: e.target.value
                               })}
                               className="edit-input"
                             />
                           </td>
                           <td>
                             <input
                               type="number"
                               step="0.01"
                               value={editingExpense.importo}
                               onChange={(e) => setEditingExpense({
                                 ...editingExpense,
                                 importo: e.target.value
                               })}
                               className="edit-input"
                             />
                           </td>
                           <td>
                             <input
                               type="text"
                               value={editingExpense.descrizione}
                               onChange={(e) => setEditingExpense({
                                 ...editingExpense,
                                 descrizione: e.target.value
                               })}
                               className="edit-input"
                             />
                           </td>
                           <td>
                             {editingExpense.immagine_scontrino && (
                               <button
                                 onClick={() => viewReceipt(editingExpense.immagine_scontrino)}
                                 className="view-receipt-button"
                                 type="button"
                               >
                                 Visualizza
                               </button>
                             )}
                           </td>
                           <td className="action-buttons">
                             <button
                               onClick={handleUpdateExpense}
                               className="save-button"
                             >
                               Salva
                             </button>
                             <button
                               onClick={() => setEditingExpense(null)}
                               className="cancel-button"
                             >
                               Annulla
                             </button>
                           </td>
                         </>
                       ) : (
                         <>
                           <td data-label="Data">
                             {expense.data_spesa 
                               ? new Date(expense.data_spesa).toLocaleDateString('it-IT')
                               : '-'}
                           </td>
                           <td data-label="Azienda">{expense.azienda}</td>
                           <td data-label="Tipo Spesa">{expense.tipo_spesa}</td>
                           <td data-label="Importo (€)">{expense.importo.toFixed(2)}</td>
                           <td data-label="Descrizione">{expense.descrizione}</td>
                           <td data-label="Scontrino">
                             {expense.immagine_scontrino && (
                               <button
                                 onClick={() => viewReceipt(expense.immagine_scontrino)}
                                 className="view-receipt-button"
                                 title="Visualizza scontrino"
                               >
                                 Visualizza
                               </button>
                             )}
                           </td>
                           <td className="action-buttons">
                             <button
                               onClick={() => handleEdit(expense)}
                               className="edit-button"
                             >
                               Modifica
                             </button>
                             <button
                               onClick={() => handleDelete(expense.id)}
                               className="delete-button"
                             >
                               Elimina
                             </button>
                           </td>
                         </>
                       )}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <div className="total">
               <h3>
                 Totale: €{expenses.reduce((acc, exp) => acc + (exp.importo || 0), 0).toFixed(2)}
               </h3>
             </div>
           </>
         ) : (
           <p className="no-data">
             {selectedCenter 
               ? 'Nessuna spesa registrata per questo centro' 
               : 'Seleziona un centro di spesa per visualizzare le relative spese'}
           </p>
         )}
       </div>
     </div>
   )
 }

 export { App }
