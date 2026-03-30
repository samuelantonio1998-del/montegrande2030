/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Quinta Monte Grande"

interface OrderItem {
  nome: string
  quantidade: number
  unidade: string
}

interface SupplierOrderProps {
  fornecedorNome?: string
  items?: OrderItem[]
}

const SupplierOrderEmail = ({ fornecedorNome, items }: SupplierOrderProps) => {
  const itemList = items || []
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Nova encomenda de {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Nova Encomenda</Heading>
          <Text style={text}>
            Exmo(a) Sr(a). {fornecedorNome || 'Fornecedor'},
          </Text>
          <Text style={text}>
            Vimos por este meio solicitar a entrega dos seguintes produtos:
          </Text>
          <Hr style={hr} />
          <Section>
            <Row style={tableHeader}>
              <Column style={colProduct}><Text style={thText}>Produto</Text></Column>
              <Column style={colQty}><Text style={thText}>Quantidade</Text></Column>
            </Row>
            {itemList.map((item, i) => (
              <Row key={i} style={i % 2 === 0 ? tableRowEven : tableRowOdd}>
                <Column style={colProduct}><Text style={tdText}>{item.nome}</Text></Column>
                <Column style={colQty}><Text style={tdText}>{item.quantidade} {item.unidade}</Text></Column>
              </Row>
            ))}
          </Section>
          <Hr style={hr} />
          <Text style={text}>
            Agradecemos a confirmação da encomenda e a indicação da data prevista de entrega.
          </Text>
          <Text style={footer}>
            Com os melhores cumprimentos,{'\n'}
            {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SupplierOrderEmail,
  subject: (data: Record<string, any>) => `Nova Encomenda — ${data.fornecedorNome || 'Fornecedor'}`,
  displayName: 'Encomenda a fornecedor',
  previewData: {
    fornecedorNome: 'Papelão Sabichão',
    items: [
      { nome: 'Bacalhau Posta', quantidade: 10, unidade: 'kg' },
      { nome: 'Azeite Virgem', quantidade: 5, unidade: 'L' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e1f0e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-line' as const }
const hr = { borderColor: '#e8ddd0', margin: '20px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '30px 0 0', whiteSpace: 'pre-line' as const }
const tableHeader = { backgroundColor: '#f5efe8', borderRadius: '6px 6px 0 0' }
const tableRowEven = { backgroundColor: '#faf8f5' }
const tableRowOdd = { backgroundColor: '#ffffff' }
const colProduct = { width: '70%', padding: '8px 12px' }
const colQty = { width: '30%', padding: '8px 12px', textAlign: 'right' as const }
const thText = { fontSize: '12px', fontWeight: 'bold' as const, color: '#2e1f0e', textTransform: 'uppercase' as const, margin: '0' }
const tdText = { fontSize: '14px', color: '#2e1f0e', margin: '0' }
