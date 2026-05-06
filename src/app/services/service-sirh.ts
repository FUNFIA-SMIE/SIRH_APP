import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServiceSirh {

  private url = 'http://localhost:3000';

  constructor(private http: HttpClient) { }


  getAllEmployees(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/employes`);
  }

  async getEmployeeById(id: string) {
    const response = await fetch(`${this.url}/employes/${id}`);
    return await response.json();
  }

  /*
  async createEmployee(employee: any) {
    const response = await fetch(`${this.url}/employes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employee),
    });
    return await response.json();
  }
*/

  updateEmployee(id: string, employee: any) {
    return fetch(`${this.url}/employes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employee),
    }).then((response) => response.json());
  }

  deleteEmployee(id: string) {
    return fetch(`${this.url}/employes/${id}`, {
      method: 'DELETE',
    }).then((response) => response.json());
  }

  // Department methods
  getAllDepartments(): Observable<any> {
    return this.http.get(`${this.url}/departements`);
  }

  createDepartment(department: any) {
    return this.http.post(`${this.url}/departements`, department);
  }


  getDepartmentById(id: number) {
    return this.http.get(`${this.url}/departements/${id}`)
  }

  updateDepartment(id: any, department: any) {
    return fetch(`${this.url}/departements/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(department),
    }).then((response) => response.json());

  }

  deleteDepartment(id: number) {
    return fetch(`${this.url}/departements/${id}`, {
      method: 'DELETE',
    }).then((response) => response.json());
  }

  nouveauDepartement(department: any) {
    return fetch(`${this.url}/departements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(department),
    }).then((response) => response.json());
  }

  NouveauPoste(poste: any): Observable<any> {
    // HttpClient.post retourne un Observable par défaut
    return this.http.post(`${this.url}/postes`, poste);
  }
  modifierPoste(id: string, poste: any): Observable<any> {
    return this.http.patch(`${this.url}/postes/${id}`, poste);
  }

  // Congé methods
  getSoldesConge(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/soldes-conge`);
  }

  getDemandesEnAttente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/conges/en-attente`);
  }

  approuverDemande(id: string): Observable<any> {
    return this.http.patch(`${this.url}/conges/${id}/approuver`, {});
  }

  refuserDemande(id: string): Observable<any> {
    return this.http.patch(`${this.url}/conges/${id}/refuser`, {});
  }

  getTypesConge(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/types-conge`);
  }

  createTypeConge(type: any): Observable<any> {
    return this.http.post(`${this.url}/types-conge`, type);
  }

  updateTypeConge(id: string, type: any): Observable<any> {
    return this.http.patch(`${this.url}/types-conge/${id}`, type);
  }

  deleteTypeConge(id: string): Observable<any> {
    return this.http.delete(`${this.url}/types-conge/${id}`);
  }

  getAllConges(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/conges/conges_en_attente`);
  }

  deletePoste(id: number) {
    return this.http.delete(`${this.url}/postes/${id}`);
  }

  getAllPostes(): Observable<any> {
    return this.http.get(`${this.url}/postes`);
  }

  getPosteById(id: number) {
    return this.http.get(`${this.url}/postes/${id}`)
  }

  createEmploye(employe: any): Observable<any> {
    return this.http.post(`${this.url}/employes`, employe);
  }

  updateEmploye(id: any, employe: any): Observable<any> {
    return this.http.put(`${this.url}/employes/${id}`, employe);
  }

  deleteEmploye(id: any): Observable<any> {
    return this.http.delete(`${this.url}/employes/${id}`);
  }

  getSoldes(employeId: any, typeId: any): Observable<any> {
    return this.http.get(`${this.url}/conges/soldes/${employeId}/${typeId}`);
  }

  getType_conge_all(employeId: any): Observable<any> {
    return this.http.get(`${this.url}/conges/soldes/${employeId}`);
  }

  // Récupérer l'historique
  getHistorique(employeId: any): Observable<any> {
    return this.http.get(`${this.url}/conges/historique/${employeId}`);
  }

  // Créer un congé
  creerConge(data: any): Observable<any> {
    return this.http.post(`${this.url}/conges`, data);
  }

  // Liste des types pour le formulaire (CP, CSS, etc.)
  getTypes(): Observable<any> {
    return this.http.get(`${this.url}/conges/type_conge`);
  }

  valider_conges(data: any): Observable<any> {
    return this.http.patch(`${this.url}/conges/valider/${data.id}`, data);
  }

  refuser_conges(data: any): Observable<any> {
    return this.http.patch(`${this.url}/conges/refuser/${data.id}`, data);
  }

  solde_conges_employe(): Observable<any> {
    return this.http.get(`${this.url}/conges/employe_solde`);
  }

  creerCompteUtilisateur(data: any): Observable<any> {
    return this.http.post(`${this.url}/employes/creation_compte_SIRH`, data);
  }

  recupererCompteUtilisateur(id: any): Observable<any> {
    return this.http.get(`${this.url}/employes/employes_utilisateurs/${id}`);
  }


}
