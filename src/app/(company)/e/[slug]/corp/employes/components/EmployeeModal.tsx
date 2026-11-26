'use client';

import * as React from 'react';
import { X, User, Briefcase, DollarSign, FileCheck, Power, ShieldAlert, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmployeeItem, EmployeeSalaryHistory } from '@/lib/payroll-store';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: Partial<EmployeeItem>, salaryRevisionReason?: string) => void;
  initialEmployee?: EmployeeItem | null;
  suggestedMatricule: string;
}

export function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
  suggestedMatricule,
}: EmployeeModalProps) {
  const isEdit = !!initialEmployee;
  const isLocked = isEdit && !!initialEmployee?.hasPayslips;

  // Section A : Personnelles
  const [lastName, setLastName] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [gender, setGender] = React.useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');

  // Section B : Professionnelles
  const [registrationNumber, setRegistrationNumber] = React.useState('');
  const [jobTitle, setJobTitle] = React.useState('');
  const [department, setDepartment] = React.useState('Commercial & Ventes');
  const [establishment, setEstablishment] = React.useState('Siège Principal Cotonou');
  const [hireDate, setHireDate] = React.useState('');
  const [contractType, setContractType] = React.useState<'CDI' | 'CDD' | 'STAGE' | 'PRESTATION'>('CDI');
  const [contractEndDate, setContractEndDate] = React.useState('');

  // Section C : Salariales
  const [baseSalary, setBaseSalary] = React.useState('80000');
  const [paymentFrequency, setPaymentFrequency] = React.useState<'MENSUEL' | 'QUINZAINE'>('MENSUEL');
  const [paymentMethod, setPaymentMethod] = React.useState<'VIREMENT' | 'ESPECES' | 'MOBILE_MONEY' | 'CHEQUE'>('VIREMENT');
  const [transportAllowance, setTransportAllowance] = React.useState('0');
  const [mealAllowance, setMealAllowance] = React.useState('0');
  const [rendementAllowance, setRendementAllowance] = React.useState('0');
  const [responsibilityAllowance, setResponsibilityAllowance] = React.useState('0');
  const [salaryRevisionReason, setSalaryRevisionReason] = React.useState('Révision salariale périodique');

  // Section D : Administratives
  const [cnssNumber, setCnssNumber] = React.useState('');
  const [ifuNumber, setIfuNumber] = React.useState('');
  const [bankName, setBankName] = React.useState('BOA Bénin');
  const [ibanOrRib, setIbanOrRib] = React.useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = React.useState('');

  // Section E : Situation
  const [status, setStatus] = React.useState<'ACTIF' | 'SUSPENDU' | 'SORTI'>('ACTIF');
  const [departureDate, setDepartureDate] = React.useState('');
  const [departureReason, setDepartureReason] = React.useState('');

  const [activeTab, setActiveTab] = React.useState<'perso' | 'pro' | 'salaire' | 'admin' | 'situation'>('perso');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialEmployee) {
      setLastName(initialEmployee.lastName || '');
      setFirstName(initialEmployee.firstName || '');
      setGender(initialEmployee.gender || 'M');
      setBirthDate(initialEmployee.birthDate || '');
      setPhone(initialEmployee.phone || '');
      setEmail(initialEmployee.email || '');
      setAddress(initialEmployee.address || '');

      setRegistrationNumber(initialEmployee.registrationNumber || '');
      setJobTitle(initialEmployee.jobTitle || '');
      setDepartment(initialEmployee.department || 'Commercial & Ventes');
      setEstablishment(initialEmployee.establishment || 'Siège Principal Cotonou');
      setHireDate(initialEmployee.hireDate || '');
      setContractType(initialEmployee.contractType || 'CDI');
      setContractEndDate(initialEmployee.contractEndDate || '');

      setBaseSalary(String(initialEmployee.baseSalary || 52000));
      setPaymentFrequency(initialEmployee.paymentFrequency || 'MENSUEL');
      setPaymentMethod(initialEmployee.paymentMethod || 'VIREMENT');
      setTransportAllowance(String(initialEmployee.transportAllowance || 0));
      setMealAllowance(String(initialEmployee.mealAllowance || 0));
      setRendementAllowance(String(initialEmployee.rendementAllowance || 0));
      setResponsibilityAllowance(String(initialEmployee.responsibilityAllowance || 0));
      setSalaryRevisionReason('Mise à jour périodique');

      setCnssNumber(initialEmployee.cnssNumber === 'En cours' ? '' : initialEmployee.cnssNumber || '');
      setIfuNumber(initialEmployee.ifuNumber || '');
      setBankName(initialEmployee.bankDetails?.bankName || 'BOA Bénin');
      setIbanOrRib(initialEmployee.bankDetails?.ibanOrRib || '');
      setMobileMoneyNumber(initialEmployee.bankDetails?.mobileMoneyNumber || '');

      setStatus(initialEmployee.status || 'ACTIF');
      setDepartureDate(initialEmployee.departureDate || '');
      setDepartureReason(initialEmployee.departureReason || '');
    } else {
      // Réinitialiser
      setLastName('');
      setFirstName('');
      setGender('M');
      setBirthDate('');
      setPhone('');
      setEmail('');
      setAddress('');

      setRegistrationNumber(suggestedMatricule);
      setJobTitle('');
      setDepartment('Commercial & Ventes');
      setEstablishment('Siège Principal Cotonou');
      setHireDate(new Date().toISOString().split('T')[0]);
      setContractType('CDI');
      setContractEndDate('');

      setBaseSalary('80000');
      setPaymentFrequency('MENSUEL');
      setPaymentMethod('VIREMENT');
      setTransportAllowance('0');
      setMealAllowance('0');
      setRendementAllowance('0');
      setResponsibilityAllowance('0');
      setSalaryRevisionReason('Rémunération initiale');

      setCnssNumber('');
      setIfuNumber('');
      setBankName('BOA Bénin');
      setIbanOrRib('');
      setMobileMoneyNumber('');

      setStatus('ACTIF');
      setDepartureDate('');
      setDepartureReason('');
    }
    setActiveTab('perso');
    setError(null);
  }, [initialEmployee, suggestedMatricule, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lastName.trim() || !firstName.trim()) {
      setError('Veuillez renseigner le nom et les prénoms du salarié.');
      setActiveTab('perso');
      return;
    }

    if (!registrationNumber.trim()) {
      setError('Le matricule est obligatoire.');
      setActiveTab('pro');
      return;
    }

    if (!jobTitle.trim()) {
      setError('Le poste occupé est obligatoire.');
      setActiveTab('pro');
      return;
    }

    const salaryVal = parseInt(baseSalary, 10);
    if (isNaN(salaryVal) || salaryVal < 52000) {
      setError('Le salaire de base brut doit respecter le SMIG béninois (minimum 52 000 FCFA).');
      setActiveTab('salaire');
      return;
    }

    const cleanFullName = `${firstName.trim()} ${lastName.trim().toUpperCase()}`;

    const payload: Partial<EmployeeItem> = {
      firstName: firstName.trim(),
      lastName: lastName.trim().toUpperCase(),
      fullName: isLocked && initialEmployee ? initialEmployee.fullName : cleanFullName,
      registrationNumber: isLocked && initialEmployee ? initialEmployee.registrationNumber : registrationNumber.trim().toUpperCase(),
      gender,
      birthDate: birthDate || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      jobTitle: jobTitle.trim(),
      department,
      establishment,
      hireDate: hireDate || new Date().toISOString().split('T')[0],
      contractType,
      contractEndDate: contractType === 'CDD' || contractType === 'STAGE' ? contractEndDate || undefined : undefined,
      baseSalary: salaryVal,
      paymentFrequency,
      paymentMethod,
      transportAllowance: parseInt(transportAllowance, 10) || 0,
      mealAllowance: parseInt(mealAllowance, 10) || 0,
      rendementAllowance: parseInt(rendementAllowance, 10) || 0,
      responsibilityAllowance: parseInt(responsibilityAllowance, 10) || 0,
      cnssNumber: cnssNumber.trim() || 'En cours',
      ifuNumber: ifuNumber.trim() || undefined,
      bankDetails: {
        bankName: bankName.trim(),
        ibanOrRib: ibanOrRib.trim(),
        mobileMoneyNumber: mobileMoneyNumber.trim() || undefined,
      },
      status,
      departureDate: status === 'SORTI' ? departureDate || undefined : undefined,
      departureReason: status === 'SORTI' ? departureReason || undefined : undefined,
    };

    onSave(payload, salaryRevisionReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-auto border border-gray-200 max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {isEdit ? (
                <>Modifier le salarié : <span className="text-blue-600 font-mono">{initialEmployee?.registrationNumber}</span> - {initialEmployee?.fullName}</>
              ) : (
                <>Nouveau Salarié • Fiche d'identification</>
              )}
            </h3>
            <p className="text-xs text-gray-500">
              Formulaire structuré conforme au Code du Travail et à la réglementation sociale (CNSS) et fiscale (ITS) du Bénin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Alerte verrouillage légal */}
        {isLocked && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <span className="font-bold">⚠️ Salarié avec bulletins émis :</span>
            <span>Par sécurité comptable et sociale, le matricule et le nom complet sont scellés. Les révisions salariales sont consignées dans l’historique.</span>
          </div>
        )}

        {/* Onglets des 5 sections */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('perso')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'perso'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            A. Infos Personnelles
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pro')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'pro'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            B. Infos Professionnelles
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('salaire')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'salaire'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            C. Rémunération & Primes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'admin'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            D. CNSS, IFU & Banque
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('situation')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'situation'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            E. Statut & Situation
          </button>
        </div>

        {/* Corps des onglets */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          {/* TAB A : PERSONNELLES */}
          {activeTab === 'perso' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nom de famille *"
                  placeholder="KOUASSI"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLocked}
                  required
                />
                <Input
                  label="Prénoms *"
                  placeholder="Romaric"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLocked}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Genre / Sexe *</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
                <Input
                  label="Date de naissance"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                <Input
                  label="Numéro de téléphone (+229) *"
                  placeholder="+229 97 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Adresse email"
                  type="email"
                  placeholder="salarie@entreprise.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Adresse résidentielle"
                  placeholder="Quartier, Ville (ex: Cadjehoun, Cotonou)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB B : PROFESSIONNELLES */}
          {activeTab === 'pro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Matricule interne *"
                  placeholder="EMP-001"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  disabled={isLocked}
                  required
                />
                <Input
                  label="Poste / Fonction occupé *"
                  placeholder="Responsable Commercial"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Service / Département *</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Commercial & Ventes">Commercial & Ventes</option>
                    <option value="Comptabilité & Finance">Comptabilité & Finance</option>
                    <option value="Logistique & Stock">Logistique & Stock</option>
                    <option value="Ressources Humaines">Ressources Humaines</option>
                    <option value="Technique & Informatique">Technique & Informatique</option>
                    <option value="Direction Générale">Direction Générale</option>
                  </select>
                </div>

                <Input
                  label="Établissement / Site"
                  placeholder="Siège Principal Cotonou"
                  value={establishment}
                  onChange={(e) => setEstablishment(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Date d'embauche *"
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type de contrat *</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as any)}
                  >
                    <option value="CDI">CDI (Durée indéterminée)</option>
                    <option value="CDD">CDD (Durée déterminée)</option>
                    <option value="STAGE">Stage professionnel</option>
                    <option value="PRESTATION">Prestation / Journalier</option>
                  </select>
                </div>

                {(contractType === 'CDD' || contractType === 'STAGE') && (
                  <Input
                    label="Date de fin de contrat"
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB C : SALAIRE & PRIMES */}
          {activeTab === 'salaire' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Salaire de base brut (FCFA) *"
                    type="number"
                    placeholder="52000"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Conforme au SMIG légal au Bénin (52 000 FCFA minimum).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mode de règlement *</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs focus:border-blue-500 focus:outline-none"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="VIREMENT">Virement bancaire</option>
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="MOBILE_MONEY">Mobile Money (MTN / Moov / Celtiis)</option>
                    <option value="CHEQUE">Chèque bancaire</option>
                  </select>
                </div>
              </div>

              {/* Primes habituelles */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="font-bold text-gray-800 block text-xs">Primes habituelles récurrentes (FCFA) :</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Prime de transport"
                    type="number"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(e.target.value)}
                  />
                  <Input
                    label="Prime de panier / restauration"
                    type="number"
                    value={mealAllowance}
                    onChange={(e) => setMealAllowance(e.target.value)}
                  />
                  <Input
                    label="Prime de rendement"
                    type="number"
                    value={rendementAllowance}
                    onChange={(e) => setRendementAllowance(e.target.value)}
                  />
                  <Input
                    label="Prime de responsabilité"
                    type="number"
                    value={responsibilityAllowance}
                    onChange={(e) => setResponsibilityAllowance(e.target.value)}
                  />
                </div>
              </div>

              {/* Si modification d'un salarié existant : motif d'historique */}
              {isEdit && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <span className="font-bold text-blue-900 block text-xs">
                    Traçabilité de la révision salariale :
                  </span>
                  <Input
                    label="Motif du changement salarial *"
                    placeholder="Ex: Augmentation annuelle, Promotion, Revalorisation"
                    value={salaryRevisionReason}
                    onChange={(e) => setSalaryRevisionReason(e.target.value)}
                  />
                  <p className="text-[10px] text-blue-700">
                    Cette mention sera consignée de façon immuable dans l’historique des rémunérations du salarié.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB D : CNSS, IFU & BANQUE */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Numéro d'immatriculation CNSS"
                  placeholder="1234567890 (ou 'En cours')"
                  value={cnssNumber}
                  onChange={(e) => setCnssNumber(e.target.value)}
                />
                <Input
                  label="Numéro IFU du salarié (DGI Bénin)"
                  placeholder="1202011111111"
                  value={ifuNumber}
                  onChange={(e) => setIfuNumber(e.target.value)}
                />
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="font-bold text-gray-800 block text-xs">Coordonnées financières :</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Banque domiciliataire"
                    placeholder="BOA Bénin, Ecobank, BGFI, etc."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                  <Input
                    label="Numéro de compte / RIB (24 caractères)"
                    placeholder="BJ061 01001 00123456789 45"
                    value={ibanOrRib}
                    onChange={(e) => setIbanOrRib(e.target.value)}
                  />
                  <Input
                    label="Numéro Mobile Money (si paiement GSM)"
                    placeholder="+229 97 00 00 00"
                    value={mobileMoneyNumber}
                    onChange={(e) => setMobileMoneyNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB E : SITUATION PROFESSIONNELLE */}
          {activeTab === 'situation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">État d'activité du salarié *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('ACTIF')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      status === 'ACTIF'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm">🟢 Actif</span>
                    <span className="text-[10px] text-gray-500 font-normal">Présent dans l'effectif & éligible à la paie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('SUSPENDU')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      status === 'SUSPENDU'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm">🟡 Suspendu</span>
                    <span className="text-[10px] text-gray-500 font-normal">Mise à pied, congé sabbatique, etc.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('SORTI')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      status === 'SORTI'
                        ? 'border-red-500 bg-red-50 text-red-800 font-bold shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm">🔴 Sorti</span>
                    <span className="text-[10px] text-gray-500 font-normal">Contrat rompu ou expiré (archivé)</span>
                  </button>
                </div>
              </div>

              {status === 'SORTI' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <span className="font-bold text-red-900 block text-xs">Motif et date de cessation d'activité :</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Date de sortie définitive"
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                    />
                    <Input
                      label="Motif du départ"
                      placeholder="Démission, Fin de CDD, Retraite, Licenciement..."
                      value={departureReason}
                      onChange={(e) => setDepartureReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>

            <div className="flex items-center gap-2">
              {activeTab !== 'situation' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeTab === 'perso') setActiveTab('pro');
                    else if (activeTab === 'pro') setActiveTab('salaire');
                    else if (activeTab === 'salaire') setActiveTab('admin');
                    else if (activeTab === 'admin') setActiveTab('situation');
                  }}
                >
                  Suivant &rarr;
                </Button>
              )}
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {isEdit ? 'Enregistrer les modifications' : 'Créer la fiche salarié'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
