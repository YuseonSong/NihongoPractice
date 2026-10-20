import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('앱',()=>{it('Nihongo Mate 대시보드와 주요 메뉴를 표시한다',()=>{render(<App/>);expect(screen.getAllByText('Nihongo Mate').length).toBeGreaterThan(0);expect(screen.getAllByText('히라가나').length).toBeGreaterThan(0);expect(screen.getAllByText('가타카나').length).toBeGreaterThan(0);expect(screen.getAllByText('일상 회화').length).toBeGreaterThan(0)})})