import React, { useState } from 'react';

interface EmployeeDetails {
  name: string;
  position: string;
  firstHalfPayment: number;
  secondHalfPayment: number;
}

const MonthlySummary: React.FC = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);

  const openModal = (details: EmployeeDetails) => {
    setEmployeeDetails(details);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEmployeeDetails(null);
  };

  return (
    <div>
      <h1>Resumen Mensual</h1>
      <button
        onClick={() =>
          openModal({
            name: 'John Doe',
            position: 'Developer',
            firstHalfPayment: 500,
            secondHalfPayment: 500,
          })
        }
      >
        Ver Detalles de Nómina
      </button>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeModal}>
              &times;
            </span>
            <h2>Detalles del Empleado</h2>
            <p>Nombre: {employeeDetails?.name}</p>
            <p>Cargo: {employeeDetails?.position}</p>
            <p>Pago Primer Quincena: {employeeDetails?.firstHalfPayment}</p>
            <p>Pago Segunda Quincena: {employeeDetails?.secondHalfPayment}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlySummary;
