export interface ValidatorData {
  address: string;
  alias: string;
  commission: string;
  max_commission_rate_change: string;
  total_bond: number;
  total_voting_power: number;
  label: string;
  value: string;
  percentage_of_total_supply: string;
  email: string | null;
  website: string | null;
  total_delegations: string;
  discord_handle: string | null;
}

export interface DataRow {
  id: number;
  alias: string;
  address: string;
  commission: number;
  total_bond: number;
  label: string;
  value: string;
  total_voting_power: number;
  email?: string | null;
  website?: string | null;
  discord_handle?: string | null;
}
