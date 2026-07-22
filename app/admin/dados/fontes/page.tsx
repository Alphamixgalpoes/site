"use client";

import { useState } from "react";
import { useFontes } from "../_hooks/useFontes";

export default function FontesPage() {
  const { fontes, loading, criar, atualizar, excluir } = useFontes();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("planilha");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editPrioridade, setEditPrioridade] = useState(0);

  async function handleCriar() {
    if (!nome.trim()) return;
    await criar({ nome: nome.trim(), tipo });
    setNome("");
    setTipo("planilha");
    setShowForm(false);
  }

  function startEdit(f: { id: string; nome: string; prioridade: number }) {
    setEditingId(f.id);
    setEditNome(f.nome);
    setEditPrioridade(f.prioridade);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    await atualizar(editingId, { nome: editNome, prioridade: editPrioridade });
    setEditingId(null);
  }

  async function handleToggleAtivo(id: string, ativo: boolean) {
    await atualizar(id, { ativo: !ativo });
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta fonte?")) return;
    await excluir(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fontes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{fontes.length} fonte{fontes.length !== 1 ? "s" : ""} cadastrada{fontes.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium"
        >
          {showForm ? "Cancelar" : "Nova fonte"}
        </button>
      </div>

      {/* Form nova fonte */}
      {showForm && (
        <div className="bg-white border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Planilha proprietarios"
                className="w-full text-sm border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full text-sm border border-gray-200 px-3 py-2 bg-white"
              >
                <option value="planilha">Planilha</option>
                <option value="api">API</option>
                <option value="scraping">Scraping</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCriar}
            disabled={!nome.trim()}
            className="text-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
          >
            Criar fonte
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : fontes.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhuma fonte cadastrada. Crie uma fonte para comecar a importar dados.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {fontes.map((fonte) => (
            <div key={fonte.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              {editingId === fonte.id ? (
                <>
                  <div className="flex-1 flex gap-3">
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="text-sm border border-gray-200 px-2 py-1 flex-1"
                    />
                    <input
                      type="number"
                      value={editPrioridade}
                      onChange={(e) => setEditPrioridade(Number(e.target.value))}
                      className="text-sm border border-gray-200 px-2 py-1 w-20"
                      placeholder="Prioridade"
                    />
                  </div>
                  <button onClick={handleSaveEdit} className="text-xs text-green-600 hover:text-green-800 font-medium">Salvar</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{fonte.nome}</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 uppercase">{fonte.tipo}</span>
                      {!fonte.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600">Inativa</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Prioridade: {fonte.prioridade}
                      {fonte.created_at && ` · Criada em ${new Date(fonte.created_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAtivo(fonte.id, fonte.ativo)}
                    className={`text-xs px-3 py-1 font-medium transition-colors ${
                      fonte.ativo
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {fonte.ativo ? "Ativa" : "Inativa"}
                  </button>
                  <button onClick={() => startEdit(fonte)} className="text-xs text-gray-400 hover:text-gray-700">Editar</button>
                  <button onClick={() => handleExcluir(fonte.id)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
